import fs from 'fs';
import path from 'path';

const sectors = [
  { src: 'minerals.html', dest: 'minerals', name: 'MineralsPage' },
  { src: 'realestate.html', dest: 'realestate', name: 'RealEstatePage' },
  { src: 'construction.html', dest: 'construction', name: 'ConstructionPage' },
  { src: 'technology.html', dest: 'technology', name: 'TechnologyPage' },
  { src: 'textiles.html', dest: 'textiles', name: 'TextilesPage' },
  { src: 'agriculture.html', dest: 'agriculture', name: 'AgriculturePage' },
  { src: 'pharmaceuticals.html', dest: 'pharmaceuticals', name: 'PharmaceuticalsPage' },
];

const srcDir = 'C:/Users/ahuss/czaah';
const destDir = 'C:/Users/ahuss/czaah-platform/src/app/sectors';

function extractContent(html) {
  // Extract inline <style> blocks from <head>
  const headStyles = [];
  const headStyleRegex = /<style>([\s\S]*?)<\/style>/g;
  let headMatch;
  const headSection = html.split('</head>')[0] || '';
  while ((headMatch = headStyleRegex.exec(headSection)) !== null) {
    headStyles.push(headMatch[1]);
  }

  // Get body content
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
  if (!bodyMatch) return { styles: '', content: '', scripts: '' };
  let body = bodyMatch[1];

  // Remove <div class="page-wrap"> wrapper opening
  body = body.replace(/^\s*<div class="page-wrap">\s*/, '');
  // Remove the closing </div> for page-wrap before WhatsApp button
  body = body.replace(/<\/div>\s*<!-- WhatsApp Floating Button -->[\s\S]*$/, '');
  // Also try without WhatsApp comment
  body = body.replace(/<\/div>\s*$/, '');

  // Remove nav section (everything from <nav> to </nav>)
  body = body.replace(/<nav>[\s\S]*?<\/nav>/g, '');

  // Remove mobile drawer
  body = body.replace(/<!-- MOBILE DRAWER -->[\s\S]*?<\/div>\s*\n/g, '');
  // More aggressive mobile drawer removal
  body = body.replace(/<div class="mobile-drawer"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<a[^>]*class="mobile-nav-cta"[^>]*>[^<]*<\/a>\s*<\/div>/g, '');

  // Remove search overlay
  body = body.replace(/<!-- SEARCH OVERLAY -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');

  // Remove footer
  body = body.replace(/<!-- FOOTER -->[\s\S]*?<\/footer>/g, '');
  body = body.replace(/<footer>[\s\S]*?<\/footer>/g, '');

  // Extract inline <style> blocks from body
  const bodyStyles = [];
  body = body.replace(/<style>([\s\S]*?)<\/style>/g, (match, content) => {
    bodyStyles.push(content);
    return '';
  });

  // Extract scripts
  const scripts = [];
  body = body.replace(/<script(?:\s+src="search\.js")?\s*>[\s\S]*?<\/script>/g, (match) => {
    if (!match.includes('search.js') || match.includes('</script>')) {
      // Only keep inline scripts, not search.js reference
      const scriptContent = match.replace(/<\/?script[^>]*>/g, '');
      if (scriptContent.trim()) {
        scripts.push(scriptContent);
      }
    }
    return '';
  });

  const allStyles = [...headStyles, ...bodyStyles].join('\n');

  return { styles: allStyles, content: body.trim(), scripts };
}

function htmlToJsx(html) {
  let jsx = html;

  // class -> className
  jsx = jsx.replace(/\bclass="/g, 'className="');
  jsx = jsx.replace(/\bclass='/g, "className='");

  // for -> htmlFor
  jsx = jsx.replace(/\bfor="/g, 'htmlFor="');

  // Self-closing tags
  jsx = jsx.replace(/<img([^>]*)(?<!\/)>/g, '<img$1 />');
  jsx = jsx.replace(/<input([^>]*)(?<!\/)>/g, '<input$1 />');
  jsx = jsx.replace(/<br\s*(?!\/)>/g, '<br />');
  jsx = jsx.replace(/<hr\s*(?!\/)>/g, '<hr />');
  jsx = jsx.replace(/<link([^>]*)(?<!\/)>/g, '<link$1 />');
  jsx = jsx.replace(/<meta([^>]*)(?<!\/)>/g, '<meta$1 />');

  // Convert inline style strings to objects - simplified approach
  // style="key: value; key2: value2" -> style={{key: 'value', key2: 'value2'}}
  jsx = jsx.replace(/style="([^"]*)"/g, (match, styleStr) => {
    const pairs = styleStr.split(';').filter(s => s.trim());
    const obj = pairs.map(pair => {
      const [key, ...vals] = pair.split(':');
      if (!key || vals.length === 0) return null;
      const cssKey = key.trim();
      const value = vals.join(':').trim();
      // Convert CSS key to camelCase
      const camelKey = cssKey.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
      return `${camelKey}: '${value}'`;
    }).filter(Boolean).join(', ');
    return `style={{${obj}}}`;
  });

  // Convert onclick to onClick
  jsx = jsx.replace(/\bonclick="/g, 'onClick="');
  jsx = jsx.replace(/\boninput="/g, 'onInput="');
  jsx = jsx.replace(/\bonchange="/g, 'onChange="');
  jsx = jsx.replace(/\bonsubmit="/g, 'onSubmit="');
  jsx = jsx.replace(/\bonfocus="/g, 'onFocus="');
  jsx = jsx.replace(/\bonblur="/g, 'onBlur="');

  // Convert onclick="functionName(args)" to onClick={() => functionName(args)}
  jsx = jsx.replace(/onClick="([^"]*)"/g, (match, handler) => {
    // Replace `this` with event reference or remove
    const cleanHandler = handler.replace(/;$/, '');
    return `onClick={() => { ${cleanHandler} }}`;
  });

  jsx = jsx.replace(/onInput="([^"]*)"/g, (match, handler) => {
    const cleanHandler = handler.replace(/;$/, '');
    return `onInput={(e) => { ${cleanHandler.replace('this.value', 'e.target.value')} }}`;
  });

  // autofocus -> autoFocus
  jsx = jsx.replace(/\bautofocus\b/g, 'autoFocus');

  // crossorigin -> crossOrigin
  jsx = jsx.replace(/\bcrossorigin\b/g, 'crossOrigin');

  // tabindex -> tabIndex
  jsx = jsx.replace(/\btabindex="/g, 'tabIndex="');

  // colspan -> colSpan
  jsx = jsx.replace(/\bcolspan="/g, 'colSpan="');

  // Replace HTML file links with Next.js routes
  jsx = jsx.replace(/href="contact\.html/g, 'href="/contact');
  jsx = jsx.replace(/href="about\.html/g, 'href="/about');
  jsx = jsx.replace(/href="register\.html/g, 'href="/register');
  jsx = jsx.replace(/href="index\.html/g, 'href="/');
  jsx = jsx.replace(/href="team\.html/g, 'href="/team');
  jsx = jsx.replace(/href="investments\.html/g, 'href="/investments');
  jsx = jsx.replace(/href="insights\.html/g, 'href="/insights');
  jsx = jsx.replace(/href="process\.html/g, 'href="/process');
  jsx = jsx.replace(/href="faq\.html/g, 'href="/faq');
  jsx = jsx.replace(/href="privacy\.html/g, 'href="/privacy');
  jsx = jsx.replace(/href="terms\.html/g, 'href="/terms');

  // Sector links
  jsx = jsx.replace(/href="minerals\.html/g, 'href="/sectors/minerals');
  jsx = jsx.replace(/href="realestate\.html/g, 'href="/sectors/realestate');
  jsx = jsx.replace(/href="construction\.html/g, 'href="/sectors/construction');
  jsx = jsx.replace(/href="technology\.html/g, 'href="/sectors/technology');
  jsx = jsx.replace(/href="textiles\.html/g, 'href="/sectors/textiles');
  jsx = jsx.replace(/href="agriculture\.html/g, 'href="/sectors/agriculture');
  jsx = jsx.replace(/href="pharmaceuticals\.html/g, 'href="/sectors/pharmaceuticals');
  jsx = jsx.replace(/href="engineering\.html/g, 'href="/sectors/engineering');
  jsx = jsx.replace(/href="aviation\.html/g, 'href="/sectors/aviation');
  jsx = jsx.replace(/href="manpower\.html/g, 'href="/sectors/manpower');
  jsx = jsx.replace(/href="tourism\.html/g, 'href="/sectors/tourism');
  jsx = jsx.replace(/href="luxury-rentals\.html/g, 'href="/sectors/luxury-rentals');
  jsx = jsx.replace(/href="education\.html/g, 'href="/sectors/education');

  // Service links
  jsx = jsx.replace(/href="business-setup\.html/g, 'href="/services/business-setup');
  jsx = jsx.replace(/href="licensing\.html/g, 'href="/services/licensing');
  jsx = jsx.replace(/href="import-export\.html/g, 'href="/services/import-export');
  jsx = jsx.replace(/href="investor-protection\.html/g, 'href="/services/investor-protection');
  jsx = jsx.replace(/href="investment-advisory\.html/g, 'href="/services/investment-advisory');
  jsx = jsx.replace(/href="partnership-development\.html/g, 'href="/services/partnership-development');
  jsx = jsx.replace(/href="government\.html/g, 'href="/services/government');
  jsx = jsx.replace(/href="security\.html/g, 'href="/services/security');
  jsx = jsx.replace(/href="payment-solutions\.html/g, 'href="/services/payment-solutions');
  jsx = jsx.replace(/href="investment-migration\.html/g, 'href="/services/investment-migration');

  // Fix data-* attributes (they're valid in JSX as-is)
  // Fix HTML comments to JSX comments
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

  return jsx;
}

function convertScriptsToReact(scripts) {
  if (!scripts || scripts.length === 0) return { stateVars: '', effectCode: '', handlerFunctions: '' };

  let allCode = scripts.join('\n\n');

  // Remove nav scroll handler (handled by Navbar component)
  allCode = allCode.replace(/\/\/ Nav scroll[\s\S]*?\}\);/g, '');
  allCode = allCode.replace(/window\.addEventListener\('scroll'[\s\S]*?\}, \{ passive: true \}\);/g, '');

  // Remove mobile hamburger code (handled by Navbar)
  allCode = allCode.replace(/\/\/ Mobile hamburger menu[\s\S]*?(?=\/\/|$)/g, '');
  allCode = allCode.replace(/const hamburger[\s\S]*?(?=\/\/[A-Z]|\n\/\/|\nconst [a-z](?!amburger)|$)/g, '');

  // Remove mobile drawer search (handled by Navbar)
  allCode = allCode.replace(/\/\/ Mobile drawer search[\s\S]*?(?=\/\/[A-Z]|\n\/\/[^\/]|$)/g, '');
  allCode = allCode.replace(/const mobileSearch[\s\S]*?(?=\/\/[A-Z]|\n\/\/[^\/]|$)/g, '');

  // Clean up the code
  allCode = allCode.trim();

  return { effectCode: allCode };
}

for (const sector of sectors) {
  const srcFile = path.join(srcDir, sector.src);
  const html = fs.readFileSync(srcFile, 'utf-8');
  const { styles, content, scripts } = extractContent(html);
  const jsxContent = htmlToJsx(content);
  const { effectCode } = convertScriptsToReact(scripts);

  // Build the component
  let component = `'use client';

import { useEffect, useRef } from 'react';
import Navbar from '@/components/layouts/Navbar';
import Footer from '@/components/layouts/Footer';

export default function ${sector.name}() {
  useEffect(() => {
    // Intersection Observer for fade-in sections
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .fade-in-scale, .stagger').forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

`;

  // Add page-specific effect code
  if (effectCode) {
    component += `  useEffect(() => {
    ${effectCode.split('\n').join('\n    ')}
  }, []);

`;
  }

  component += `  return (
    <>
      <Navbar />
`;

  // Add inline styles as a <style> tag if present
  if (styles.trim()) {
    component += `      <style dangerouslySetInnerHTML={{ __html: \`${styles.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />
`;
  }

  component += `      ${jsxContent.split('\n').join('\n      ')}
      <Footer />
    </>
  );
}
`;

  const destFile = path.join(destDir, sector.dest, 'page.tsx');
  fs.writeFileSync(destFile, component, 'utf-8');
  console.log(`Created ${destFile}`);
}

console.log('All sectors converted!');
