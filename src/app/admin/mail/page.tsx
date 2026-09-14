'use client'

import MailWorkspace from '@/components/mail/MailWorkspace'

export default function AdminMailPage() {
  return (
    <MailWorkspace
      heading="Partner Mail"
      outboundLabel="Partner"
      monitorNote="Replying as this partner's mailbox — monitor view."
      exitHref="/admin"
      exitLabel="Back to admin"
    />
  )
}
