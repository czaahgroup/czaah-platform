import { NextRequest, NextResponse } from 'next/server'
import { requireCrmAccess } from '@/lib/crmAuth'
import { logActivity } from '@/lib/activity'
import { logError } from '@/lib/logError'

/**
 * GET /api/crm/duplicates?type=contact|company
 *   Finds likely-duplicate records by normalised name, shared email,
 *   shared phone (contacts) or shared domain (companies). Dismissed pairs
 *   are filtered out. Admin only. No AI — deterministic matching.
 *
 * POST /api/crm/duplicates  { type, keepId, mergeId }        -> merge
 * POST /api/crm/duplicates  { type, idA, idB, dismiss:true } -> "not a dupe"
 */
const CO_SUFFIX = /\b(ltd|limited|llc|l\.l\.c|inc|incorporated|co|corp|corporation|plc|gmbh|sarl|pvt|private|group|holdings?|company|dmcc|fze|fzco)\b/g

function normName(s: string | null): string {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(CO_SUFFIX, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}
function normEmail(s: string | null): string { return String(s || '').trim().toLowerCase() }
function normPhone(s: string | null): string { return String(s || '').replace(/[^\d]/g, '').replace(/^0+/, '') }
function normDomain(s: string | null): string {
  return String(s || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
}

export async function GET(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.scope !== 'all') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const type = request.nextUrl.searchParams.get('type') === 'company' ? 'company' : 'contact'

    const { data: dismissed } = await access.supabase
      .from('crm_duplicate_dismissals').select('id_low, id_high').eq('object_type', type)
    const dismissedSet = new Set((dismissed || []).map((d) => `${d.id_low}|${d.id_high}`))

    const rows = type === 'contact'
      ? (await access.supabase.from('crm_contacts').select('id, name, email, phone, type, created_at, company:crm_companies(name)').limit(4000)).data || []
      : (await access.supabase.from('crm_companies').select('id, name, domain, website, stage, created_at').limit(4000)).data || []

    // bucket -> [ids], per signal
    const buckets: Record<string, { reason: string; map: Map<string, string[]> }> = {
      name: { reason: 'Same name', map: new Map() },
      email: { reason: 'Same email', map: new Map() },
      phone: { reason: 'Same phone', map: new Map() },
      domain: { reason: 'Same domain', map: new Map() },
    }
    for (const r of rows as any[]) {
      const n = normName(r.name)
      if (n.length > 1) push(buckets.name.map, n, r.id)
      if (type === 'contact') {
        const e = normEmail(r.email); if (e.includes('@')) push(buckets.email.map, e, r.id)
        const p = normPhone(r.phone); if (p.length >= 7) push(buckets.phone.map, p, r.id)
      } else {
        const d = normDomain(r.domain) || normDomain(r.website); if (d.includes('.')) push(buckets.domain.map, d, r.id)
      }
    }

    const byId = new Map((rows as any[]).map((r) => [r.id, r]))
    const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
    const pairs = new Map<string, { ids: string[]; reasons: Set<string> }>()

    for (const b of Object.values(buckets)) {
      for (const ids of b.map.values()) {
        if (ids.length < 2) continue
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
          const k = pairKey(ids[i], ids[j])
          if (dismissedSet.has(k)) continue
          if (!pairs.has(k)) pairs.set(k, { ids: k.split('|'), reasons: new Set() })
          pairs.get(k)!.reasons.add(b.reason)
        }
      }
    }

    const groups = [...pairs.values()].map((p) => ({
      records: p.ids.map((id) => trim(byId.get(id), type)),
      reasons: [...p.reasons],
      strength: p.reasons.size > 1 ? 'high' : p.reasons.has('Same email') || p.reasons.has('Same domain') ? 'high' : 'medium',
    })).sort((a, b) => (a.strength === b.strength ? 0 : a.strength === 'high' ? -1 : 1))

    return NextResponse.json({ data: groups, total: groups.length })
  } catch (err) {
    logError('api.crm.duplicates.get', err)
    return NextResponse.json({ error: 'Could not scan for duplicates.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireCrmAccess(request)
  if ('error' in access) return access.error
  if (access.scope !== 'all') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const b = await request.json().catch(() => ({}))
    const type = b.type === 'company' ? 'company' : 'contact'

    if (b.dismiss) {
      if (!b.idA || !b.idB || b.idA === b.idB) return NextResponse.json({ error: 'Two distinct ids are required.' }, { status: 400 })
      const [low, high] = [b.idA, b.idB].sort()
      const { error } = await access.supabase.from('crm_duplicate_dismissals')
        .insert({ object_type: type, id_low: low, id_high: high, dismissed_by: access.userId })
      if (error && (error as any).code !== '23505') throw error
      return NextResponse.json({ success: true })
    }

    // merge — irreversible, super admin only
    if (access.role !== 'super_admin') return NextResponse.json({ error: 'Only a super admin can merge records.' }, { status: 403 })
    const keepId = b.keepId, mergeId = b.mergeId
    if (!keepId || !mergeId || keepId === mergeId) return NextResponse.json({ error: 'keepId and mergeId (distinct) are required.' }, { status: 400 })
    const fn = type === 'company' ? 'crm_merge_companies' : 'crm_merge_contacts'
    const { error } = await access.supabase.rpc(fn, { p_winner: keepId, p_loser: mergeId })
    if (error) throw error
    await logActivity({ actorId: access.userId, action: `${type}.merged`, targetType: type, targetId: keepId, metadata: { mergedFrom: mergeId } })
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.crm.duplicates.post', err)
    return NextResponse.json({ error: 'Could not complete that action.' }, { status: 500 })
  }
}

function push(m: Map<string, string[]>, k: string, id: string) {
  const a = m.get(k); if (a) { if (!a.includes(id)) a.push(id) } else m.set(k, [id])
}
function trim(r: any, type: string) {
  if (!r) return null
  return type === 'company'
    ? { id: r.id, name: r.name, domain: r.domain, stage: r.stage, createdAt: r.created_at }
    : { id: r.id, name: r.name, email: r.email, phone: r.phone, type: r.type, company: r.company?.name || null, createdAt: r.created_at }
}
