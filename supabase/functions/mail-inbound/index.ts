// Receives Resend's "email.received" webhook for mail.czaah.com, resolves the
// destination partner mailbox, fetches the full parsed body via Resend's
// receiving API, and writes it into mailbox_threads/mailbox_messages.
//
// Deployed independently of czaah-platform (see project memory on the
// Cloudflare Worker 3 MiB deploy block) so it works regardless of that app's
// deploy status.

import { Resend } from 'npm:resend@6.9.3';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const resend = new Resend(RESEND_API_KEY);

async function sb(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

function normalizeSubject(subject: string) {
  return subject.replace(/^\s*(re|fwd?)\s*:\s*/i, '').trim();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = await req.text();
  let event;
  try {
    event = resend.webhooks.verify({ payload, headers: req.headers, webhookSecret: RESEND_WEBHOOK_SECRET });
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }

  if (event.type !== 'email.received') {
    return new Response('ignored', { status: 200 });
  }

  const { email_id, to, from, subject, message_id } = event.data;

  const toAddresses = to.map((a: string) => a.toLowerCase());
  const inList = toAddresses.map((a: string) => `"${a}"`).join(',');
  const mailboxes = await sb(`/partner_mailboxes?address=in.(${inList})&select=id,address`);
  if (!mailboxes.length) {
    console.log('no matching mailbox for', toAddresses);
    return new Response('no matching mailbox', { status: 200 });
  }
  const mailbox = mailboxes[0];

  const { data: full, error } = await resend.emails.receiving.get(email_id);
  if (error || !full) {
    console.error('failed to fetch received email body', error);
    return new Response('failed to fetch email body', { status: 500 });
  }

  const headers = full.headers || {};
  const inReplyTo = headers['In-Reply-To'] || headers['in-reply-to'] || null;
  const references = headers['References'] || headers['references'] || null;
  const refCandidates: string[] = [inReplyTo, ...(references ? references.split(/\s+/) : [])].filter(Boolean);

  let threadId: string | null = null;

  if (refCandidates.length) {
    const inList2 = refCandidates.map((r) => `"${r}"`).join(',');
    const existing = await sb(
      `/mailbox_messages?mailbox_id=eq.${mailbox.id}&message_id_header=in.(${inList2})&select=thread_id&limit=1`
    );
    if (existing.length) threadId = existing[0].thread_id;
  }

  if (!threadId) {
    const normalized = normalizeSubject(subject);
    const existingThreads = await sb(
      `/mailbox_threads?mailbox_id=eq.${mailbox.id}&external_address=eq.${encodeURIComponent(from)}&subject=eq.${encodeURIComponent(normalized)}&select=id&limit=1`
    );
    if (existingThreads.length) {
      threadId = existingThreads[0].id;
    } else {
      const created = await sb('/mailbox_threads', {
        method: 'POST',
        body: JSON.stringify({ mailbox_id: mailbox.id, subject: normalized || subject, external_address: from }),
      });
      threadId = created[0].id;
    }
  }

  await sb(`/mailbox_threads?id=eq.${threadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ last_message_at: new Date().toISOString() }),
  });

  const inserted = await sb('/mailbox_messages', {
    method: 'POST',
    body: JSON.stringify({
      thread_id: threadId,
      mailbox_id: mailbox.id,
      direction: 'inbound',
      from_address: from,
      to_address: mailbox.address,
      subject,
      body_text: full.text,
      body_html: full.html,
      message_id_header: message_id,
      in_reply_to: inReplyTo,
    }),
  });
  const insertedMessageId = inserted[0].id;

  for (const att of full.attachments || []) {
    try {
      const { data: attData } = await resend.emails.receiving.attachments.get({ emailId: email_id, id: att.id });
      if (!attData?.download_url) continue;
      const fileRes = await fetch(attData.download_url);
      const bytes = await fileRes.arrayBuffer();
      const storagePath = `${mailbox.id}/${insertedMessageId}/${att.filename || att.id}`;

      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/mailbox-attachments/${storagePath}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': attData.content_type || 'application/octet-stream',
        },
        body: bytes,
      });
      if (!uploadRes.ok) {
        console.error('attachment upload failed', await uploadRes.text());
        continue;
      }

      await sb('/mailbox_attachments', {
        method: 'POST',
        body: JSON.stringify({
          message_id: insertedMessageId,
          filename: att.filename,
          content_type: attData.content_type,
          size: attData.size,
          storage_path: storagePath,
        }),
      });
    } catch (e) {
      console.error('attachment handling failed', e);
    }
  }

  return new Response('ok', { status: 200 });
});
