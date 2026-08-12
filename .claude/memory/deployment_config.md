---
name: deployment_config
description: Cloudflare Pages deployment configuration - Next.js 15, build adapter, output directory, env vars
type: reference
---

- Platform: Cloudflare Pages
- Next.js version: 15.5.14 (downgraded from 16 for compatibility)
- Build command: `npx @cloudflare/next-on-pages@1`
- Output directory: `.vercel/output/static` (set in wrangler.toml as pages_build_output_dir)
- wrangler.toml has `compatibility_flags = ["nodejs_compat"]`
- .env.production committed to repo (private repo) with Supabase, Resend, NewsAPI keys
- ESLint and TypeScript errors ignored during build via next.config.ts
- Edge runtime on API routes only (84 routes), NOT on page components
- Admin layout converted to client component to avoid server-side rendering on Cloudflare
- Resend client uses lazy proxy pattern to avoid build-time crash
- Navbar Supabase client uses lazy initialization
- Domain: czaah.com + www.czaah.com on Cloudflare
