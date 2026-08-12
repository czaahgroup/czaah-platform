import { NextRequest, NextResponse } from 'next/server'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { rateLimit } from '@/lib/rateLimit'

export const runtime = 'edge';

const EMAIL_HEADER = `
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="color: #C9A84C; font-family: 'Cinzel', Georgia, serif; font-size: 28px; letter-spacing: 6px; margin: 0;">CZAAH</h1>
    <p style="color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 4px; margin-top: 8px;">CAPITAL · VENTURES · INFRASTRUCTURE</p>
  </div>
`

const EMAIL_FOOTER = `
  <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin-top: 32px;">
    &copy; 2026 CZAAH. All rights reserved.
  </p>
`

function wrapEmail(inner: string) {
  return `
    <div style="font-family: 'Raleway', Arial, sans-serif; background: #000000; color: #ffffff; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
      ${EMAIL_HEADER}
      <div style="background: #080808; border: 1px solid #1A1A1A; border-radius: 8px; padding: 32px;">
        ${inner}
      </div>
      ${EMAIL_FOOTER}
    </div>
  `
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 per hour per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const { success } = rateLimit(`contact:${ip}`, 3, 3600000)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, email, phone, interest, message } = body

    // Validate required fields
    if (!name || !email || !interest || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, interest, message' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 }
      )
    }

    // Send notification email to info@czaah.com
    await resend.emails.send({
      from: FROM_EMAIL,
      to: 'info@czaah.com',
      subject: `New Contact Enquiry — ${interest}`,
      html: wrapEmail(`
        <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">New Contact Form Submission</h2>
        <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
          A new enquiry has been received via the website contact form.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
          <tr>
            <td style="color: rgba(255,255,255,0.4); padding: 8px 0; font-size: 13px; vertical-align: top; width: 120px;">Name</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 13px;">${name}</td>
          </tr>
          <tr>
            <td style="color: rgba(255,255,255,0.4); padding: 8px 0; font-size: 13px; vertical-align: top;">Email</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 13px;"><a href="mailto:${email}" style="color: #C9A84C; text-decoration: none;">${email}</a></td>
          </tr>
          ${phone ? `
          <tr>
            <td style="color: rgba(255,255,255,0.4); padding: 8px 0; font-size: 13px; vertical-align: top;">Phone</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 13px;">${phone}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="color: rgba(255,255,255,0.4); padding: 8px 0; font-size: 13px; vertical-align: top;">Interest</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 13px;">${interest}</td>
          </tr>
          <tr>
            <td style="color: rgba(255,255,255,0.4); padding: 8px 0; font-size: 13px; vertical-align: top;">Message</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 13px; line-height: 1.6;">${message.replace(/\n/g, '<br/>')}</td>
          </tr>
        </table>
        <a href="mailto:${email}" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Reply to ${name} &rarr;
        </a>
      `),
    })

    // Send confirmation email to the user
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Thank you for contacting CZAAH',
      html: wrapEmail(`
        <h2 style="color: #C9A84C; font-size: 20px; margin: 0 0 16px 0;">We've Received Your Message</h2>
        <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
          Dear ${name},
        </p>
        <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 16px 0;">
          Thank you for reaching out to CZAAH. We have received your enquiry regarding <strong style="color: #ffffff;">${interest}</strong> and a member of our team will respond within 24 hours.
        </p>
        <p style="color: rgba(255,255,255,0.6); line-height: 1.6; margin: 0 0 24px 0;">
          In the meantime, feel free to explore our sectors and services on our website.
        </p>
        <a href="https://czaah.com/sectors" style="display: inline-block; background: #C9A84C; color: #000000; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">
          Explore Our Sectors &rarr;
        </a>
      `),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/contact error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
