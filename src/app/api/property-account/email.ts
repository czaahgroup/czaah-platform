/**
 * The CZAAH Properties account email. `title` and `body` must already be safe
 * HTML (callers escape anything a visitor typed); `href` is a URL we built.
 */
export function accountEmail(title: string, body: string, href: string, cta: string) {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 26px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
        <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">PROPERTIES</p>
      </div>
      <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
        <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">${title}</h2>
        <p style="color: rgba(255,255,255,0.7); line-height: 1.6; margin: 0 0 24px 0;">${body}</p>
        <a href="${href}" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">${cta} &rarr;</a>
        <p style="color: rgba(255,255,255,0.4); font-size: 12px; line-height: 1.6; margin: 24px 0 0 0;">This link works once and expires after a short time.</p>
      </div>
      <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 32px;">&copy; 2026 CZAAH. All rights reserved.</p>
    </div>
  `
}
