/**
 * Outbound-attachment plumbing for the compose + reply routes.
 *
 * The browser uploads each file straight to the `mailbox-attachments` bucket
 * via a signed URL (see api/mail/attachments/upload), then hands the send route
 * an array of refs: { path, filename, contentType, size }. Here we validate
 * those refs, materialise them as base64 for Resend, and persist a
 * mailbox_attachments row per file once the message exists.
 *
 * Edge-safe — uses fetch/btoa, no Node Buffer.
 */

const BUCKET = 'mailbox-attachments'
const MAX_FILES = 20
const MAX_TOTAL = 20 * 1024 * 1024

export type AttachmentRef = {
  path: string
  filename: string
  contentType: string
  size: number
}

export function parseAttachmentRefs(
  raw: unknown,
  mailboxId: string
):
  | { ok: true; refs: AttachmentRef[] }
  | { ok: false; error: string } {
  if (raw == null) return { ok: true, refs: [] }
  if (!Array.isArray(raw)) return { ok: false, error: 'attachments must be an array.' }
  if (raw.length > MAX_FILES) return { ok: false, error: `Too many attachments (max ${MAX_FILES}).` }

  const prefix = `outbound/${mailboxId}/`
  const refs: AttachmentRef[] = []
  let total = 0

  for (const item of raw) {
    if (!item || typeof item !== 'object') return { ok: false, error: 'Malformed attachment entry.' }
    const path = String((item as any).path || '')
    const size = Number((item as any).size || 0)
    if (!path.startsWith(prefix) || path.includes('..')) {
      return { ok: false, error: 'Attachment does not belong to this mailbox.' }
    }
    total += size
    if (total > MAX_TOTAL) return { ok: false, error: 'Attachments exceed the 20 MB total limit.' }
    refs.push({
      path,
      filename: String((item as any).filename || 'attachment').slice(0, 200),
      contentType: String((item as any).contentType || 'application/octet-stream'),
      size,
    })
  }

  return { ok: true, refs }
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** Download each ref from storage and shape it for `resend.emails.send({ attachments })`. */
export async function resendAttachmentsFromRefs(
  supabase: any,
  refs: AttachmentRef[]
): Promise<{ filename: string; content: string }[]> {
  const out: { filename: string; content: string }[] = []
  for (const ref of refs) {
    const { data, error } = await supabase.storage.from(BUCKET).download(ref.path)
    if (error || !data) throw new Error(`Could not read attachment "${ref.filename}".`)
    out.push({ filename: ref.filename, content: toBase64(await data.arrayBuffer()) })
  }
  return out
}

/** Record one mailbox_attachments row per sent file, now that the message row exists. */
export async function persistOutboundAttachments(
  supabase: any,
  _mailboxId: string,
  messageId: string,
  refs: AttachmentRef[]
): Promise<void> {
  if (!refs.length) return
  await supabase.from('mailbox_attachments').insert(
    refs.map((r) => ({
      message_id: messageId,
      filename: r.filename,
      content_type: r.contentType,
      size: r.size,
      storage_path: r.path,
    }))
  )
}
