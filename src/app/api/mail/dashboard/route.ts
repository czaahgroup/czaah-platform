import { NextRequest, NextResponse } from 'next/server'
import { requireMailAccess } from '@/lib/mailAuth'


// $/1M tokens (input, output) — keep in sync with the model used in mailAi.
// CZAAH Mail runs on Cloudflare Workers AI, which has a free daily allowance,
// so estimated spend is 0 unless a paid model is wired in later.
const PRICE: Record<string, [number, number]> = {
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': [0, 0],
  'claude-haiku-4-5': [1, 5],
  'claude-sonnet-5': [2, 10],
  'claude-opus-5': [5, 25],
}
function costOf(model: string | null, inTok: number, outTok: number) {
  const [pi, po] = PRICE[model || ''] || [0, 0]
  return (inTok / 1e6) * pi + (outTok / 1e6) * po
}
function median(nums: number[]) {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export async function GET(request: NextRequest) {
  const access = await requireMailAccess(request)
  if ('error' in access) return access.error
  if (!access.isSuperAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const supabase = access.supabase

  const now = Date.now()
  const since30 = new Date(now - 30 * 864e5).toISOString()
  const since90 = new Date(now - 90 * 864e5).toISOString()

  const [{ data: mailboxes }, { data: msgs30 }, { data: threads }, { data: ai }, { data: contacts }, { data: templates }] =
    await Promise.all([
      supabase.from('partner_mailboxes').select('id, address, display_name'),
      supabase.from('mailbox_messages').select('mailbox_id, thread_id, direction, created_at').gte('created_at', since30),
      supabase.from('mailbox_threads').select('id, mailbox_id, external_address, last_message_at, archived_at, created_at').is('deleted_at', null),
      supabase.from('mail_ai_events').select('mailbox_id, action, model, input_tokens, output_tokens, created_at'),
      supabase.from('mail_contacts').select('email, status, created_at'),
      supabase.from('mail_templates').select('id, mailbox_id, is_shared'),
    ])

  const mbName: Record<string, string> = {}
  for (const m of mailboxes || []) mbName[m.id] = m.display_name || m.address

  // ---- volume (30d) ----
  const vol: Record<string, { in: number; out: number }> = {}
  for (const m of mailboxes || []) vol[m.id] = { in: 0, out: 0 }
  for (const m of msgs30 || []) {
    if (!vol[m.mailbox_id]) vol[m.mailbox_id] = { in: 0, out: 0 }
    if (m.direction === 'inbound') vol[m.mailbox_id].in++
    else vol[m.mailbox_id].out++
  }

  // ---- first-response time (threads created in last 30d) ----
  const recentThreadIds = (threads || []).filter((t) => t.created_at >= since30).map((t) => t.id)
  const frtByMailbox: Record<string, number[]> = {}
  if (recentThreadIds.length) {
    const chunks: string[][] = []
    for (let i = 0; i < recentThreadIds.length; i += 200) chunks.push(recentThreadIds.slice(i, i + 200))
    const rows: any[] = []
    for (const c of chunks) {
      const { data } = await supabase
        .from('mailbox_messages')
        .select('thread_id, mailbox_id, direction, created_at')
        .in('thread_id', c)
        .order('created_at', { ascending: true })
      rows.push(...(data || []))
    }
    const byThread: Record<string, any[]> = {}
    for (const r of rows) (byThread[r.thread_id] ||= []).push(r)
    for (const [, list] of Object.entries(byThread)) {
      const firstIn = list.find((r) => r.direction === 'inbound')
      if (!firstIn) continue
      const firstOut = list.find((r) => r.direction === 'outbound' && r.created_at > firstIn.created_at)
      if (!firstOut) continue
      const mins = (new Date(firstOut.created_at).getTime() - new Date(firstIn.created_at).getTime()) / 60000
      ;(frtByMailbox[firstIn.mailbox_id] ||= []).push(mins)
    }
  }

  // ---- unanswered queue ----
  const candidates = (threads || []).filter((t) => !t.archived_at && t.last_message_at >= since90)
  const candIds = candidates.map((t) => t.id)
  const lastDir: Record<string, { dir: string; at: string }> = {}
  if (candIds.length) {
    const chunks: string[][] = []
    for (let i = 0; i < candIds.length; i += 200) chunks.push(candIds.slice(i, i + 200))
    for (const c of chunks) {
      const { data } = await supabase
        .from('mailbox_messages')
        .select('thread_id, direction, created_at')
        .in('thread_id', c)
      for (const r of data || []) {
        const cur = lastDir[r.thread_id]
        if (!cur || r.created_at > cur.at) lastDir[r.thread_id] = { dir: r.direction, at: r.created_at }
      }
    }
  }
  const unanswered = candidates
    .filter((t) => lastDir[t.id]?.dir === 'inbound')
    .map((t) => ({
      threadId: t.id,
      mailboxId: t.mailbox_id,
      mailbox: mbName[t.mailbox_id] || '—',
      externalAddress: t.external_address,
      waitingSince: lastDir[t.id].at,
      ageHours: Math.round((now - new Date(lastDir[t.id].at).getTime()) / 36e5),
    }))
    .sort((a, b) => b.ageHours - a.ageHours)

  // ---- AI usage + cost ----
  const aiByAction: Record<string, number> = {}
  let aiCost = 0
  let aiIn = 0
  let aiOut = 0
  const ai30 = (ai || []).filter((e) => e.created_at >= since30)
  for (const e of ai || []) {
    aiByAction[e.action] = (aiByAction[e.action] || 0) + 1
    aiIn += e.input_tokens || 0
    aiOut += e.output_tokens || 0
    aiCost += costOf(e.model, e.input_tokens || 0, e.output_tokens || 0)
  }

  // ---- contacts ----
  const cByStatus: Record<string, number> = {}
  let cNew30 = 0
  for (const c of contacts || []) {
    cByStatus[c.status] = (cByStatus[c.status] || 0) + 1
    if (c.created_at >= since30) cNew30++
  }
  const threadCountByEmail: Record<string, number> = {}
  for (const t of threads || []) {
    const e = (t.external_address || '').toLowerCase()
    if (e) threadCountByEmail[e] = (threadCountByEmail[e] || 0) + 1
  }
  const topContacts = Object.entries(threadCountByEmail)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }))

  // ---- templates ----
  const tplShared = (templates || []).filter((t) => t.is_shared).length
  const tplPersonal = (templates || []).length - tplShared

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    totals: {
      threads: (threads || []).length,
      inbound30: (msgs30 || []).filter((m) => m.direction === 'inbound').length,
      outbound30: (msgs30 || []).filter((m) => m.direction === 'outbound').length,
      unanswered: unanswered.length,
      contacts: (contacts || []).length,
      aiActions: (ai || []).length,
      aiActions30: ai30.length,
      aiCostAllTime: Math.round(aiCost * 100) / 100,
      aiTokens: { input: aiIn, output: aiOut },
      templates: { shared: tplShared, personal: tplPersonal },
    },
    mailboxes: (mailboxes || []).map((m) => ({
      id: m.id,
      name: mbName[m.id],
      address: m.address,
      inbound30: vol[m.id]?.in || 0,
      outbound30: vol[m.id]?.out || 0,
      medianFirstResponseMins: median(frtByMailbox[m.id] || []),
      responsesSampled: (frtByMailbox[m.id] || []).length,
    })),
    unanswered: unanswered.slice(0, 50),
    aiByAction,
    contactsByStatus: cByStatus,
    contactsNew30: cNew30,
    topContacts,
  })
}
