import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'
import { escapeHtml } from '@/lib/escapeHtml'
import { resend, FROM_EMAIL } from '@/lib/resend/client'
import { LISTING_COLUMNS } from '@/lib/developments'
import { allowedCountries, loadLocationTree } from '@/lib/propertyLocations'
import { loadPortalContent } from '@/lib/portalContent'
import { filterListings } from '@/lib/listingSearch'
import { marketFiltersFor } from '@/lib/marketFields'
import { parseSearchPath, newSince, ALERT_MAX_LISTINGS } from '@/lib/savedSearchAlerts'
import { resolveLocation } from '@/app/property-portal/_components/locationNav'

const SITE = 'https://property.czaah.com'
const clean = (path: string) => path.replace(/^\/property-portal/, '') || '/'

/**
 * POST /api/property-account/alerts — daily cron (.github/workflows/
 * saved-search-alerts.yml), Bearer CRON_SECRET.
 *
 * For every saved search with email alerts on: the listings that went live
 * since its last alert AND that its page would show (the same
 * filterListings() the page uses) are emailed to the buyer. last_alerted_at
 * moves on either way, so nothing is ever sent twice.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const db = createAdminClient()
    const { data: searches, error } = await db
      .from('saved_searches')
      .select('id, user_id, name, path, created_at, last_alerted_at, alert_token')
      .eq('email_alerts', true)
      .limit(2000)
    if (error) throw error
    if (!searches?.length) return NextResponse.json({ searches: 0, emailed: 0 })

    const [content, tree] = await Promise.all([loadPortalContent(), loadLocationTree()])
    const markets = await allowedCountries(content.settings.countries)
    let q = db.from('property_listings').select(`${LISTING_COLUMNS}, approved_at`).eq('status', 'approved').order('created_at', { ascending: false }).limit(2000)
    if (markets) q = q.in('country', markets.length ? markets : ['__none__'])
    const { data: listings, error: lErr } = await q
    if (lErr) throw lErr
    const fx = content.settings.fxPerUsd

    const emails = new Map<string, string | null>()
    const emailFor = async (userId: string) => {
      if (!emails.has(userId)) {
        const { data } = await db.auth.admin.getUserById(userId)
        emails.set(userId, data.user?.email ?? null)
      }
      return emails.get(userId) ?? null
    }

    const runAt = new Date().toISOString()
    let emailed = 0
    let failed = 0
    for (const s of searches) {
      try {
        const parsed = parseSearchPath(s.path)
        const fresh = newSince(listings || [], s)
        let matches: typeof fresh = []
        if (parsed && fresh.length) {
          const loc = parsed.section === 'buy' || parsed.section === 'rent' ? resolveLocation(tree, parsed.countrySlug, parsed.citySlug) : null
          // A location that has since been switched off matches nothing.
          if (!(parsed.countrySlug && !loc)) {
            matches = filterListings(fresh, parsed.section, parsed.params, {
              fxPerUsd: fx,
              loc,
              marketFilters: loc && (parsed.section === 'buy' || parsed.section === 'rent') ? marketFiltersFor(loc.country.code, parsed.section) : [],
            })
          }
        }
        if (matches.length) {
          const to = await emailFor(s.user_id)
          if (to) {
            const { error: sendError } = await resend.emails.send({ from: FROM_EMAIL, to, subject: alertSubject(s.name, matches.length), html: alertEmail(s, matches) })
            // Not sent: leave last_alerted_at alone so tomorrow's run tries again.
            if (sendError) { logError('api.property-account.alerts', sendError, { search: s.id, step: 'send' }); failed++; continue }
            emailed++
          }
        }
        await db.from('saved_searches').update({ last_alerted_at: runAt }).eq('id', s.id)
      } catch (err) {
        // One bad search must not stop everyone else's alerts.
        logError('api.property-account.alerts', err, { search: s.id })
      }
    }
    return NextResponse.json({ searches: searches.length, emailed, failed })
  } catch (err) {
    logError('api.property-account.alerts', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function alertSubject(name: string, n: number) {
  return `${n} new ${n === 1 ? 'property matches' : 'properties match'} “${name.slice(0, 60)}”`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function price(p: Record<string, any>) {
  if (!p.price) return 'Price on request'
  const amount = `${p.currency} ${Number(p.price).toLocaleString('en-GB')}`
  if (p.listing_type === 'rent' || p.listing_type === 'lease') return `${amount} / ${p.rent_period === 'year' ? 'year' : 'month'}`
  return amount
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function alertEmail(s: { name: string; path: string; alert_token: string }, matches: Record<string, any>[]) {
  const e = escapeHtml
  const shown = matches.slice(0, ALERT_MAX_LISTINGS)
  const rows = shown.map((p) => `
    <tr><td style="padding:12px 0;border-top:1px solid #1f1f1f">
      <a href="${SITE}/${p.id}" style="color:#fff;font-size:15px;font-weight:600;text-decoration:none">${e(p.title)}</a>
      <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:4px">${e([p.city, p.country].filter(Boolean).join(', '))}</div>
      <div style="color:#C9A84C;font-size:14px;margin-top:4px">${e(price(p))}</div>
    </td></tr>`).join('')
  const more = matches.length > shown.length ? `<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:12px 0 0">…and ${matches.length - shown.length} more.</p>` : ''
  return `<div style="font-family:'Raleway',Arial,sans-serif;background:#000;color:#fff;padding:40px 20px;max-width:600px;margin:0 auto">
    <div style="text-align:center;margin-bottom:28px"><h1 style="color:#C9A84C;font-family:'Cinzel',Georgia,serif;font-size:26px;letter-spacing:6px;margin:0">CZAAH</h1><p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:4px;margin-top:8px">PROPERTIES</p></div>
    <div style="background:#080808;border:1px solid #1A1A1A;border-radius:8px;padding:28px">
      <h2 style="color:#C9A84C;font-size:19px;margin:0 0 6px">New for your saved search</h2>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:0 0 10px">${e(s.name)}</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>${more}
      <p style="margin:22px 0 0"><a href="${SITE}${e(clean(s.path))}" style="display:inline-block;background:#C9A84C;color:#000;padding:11px 26px;border-radius:4px;text-decoration:none;font-weight:600;font-size:14px">See all results &rarr;</a></p>
    </div>
    <p style="color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;text-align:center;margin-top:24px">
      You asked for these alerts on CZAAH Properties.
      <a href="${SITE}/alerts/unsubscribe?token=${s.alert_token}" style="color:rgba(255,255,255,0.6)">Stop alerts for this search</a> ·
      <a href="${SITE}/account#searches" style="color:rgba(255,255,255,0.6)">Manage your saved searches</a>
    </p>
  </div>`
}
