import { Resend } from 'resend'

let _resend: Resend | null = null

export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!)
  }
  return _resend
}

// Keep backward compat — lazy getter
export const resend = new Proxy({} as Resend, {
  get(_, prop) {
    return (getResend() as any)[prop]
  },
})

export const FROM_EMAIL = 'CZAAH <notifications@czaah.com>'
