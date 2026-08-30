'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SUPPORTED_LOCALES } from '@/lib/intl/i18n'
import { COMMON_ZONES, clockIn } from '@/lib/intl/datetime'

const LOCALE_LABEL: Record<string, string> = { en: 'English', ar: 'العربية', ur: 'اردو', fr: 'Français', zh: '中文' }

export function RegionalPreferences() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currencies, setCurrencies] = useState<any[]>([])
  const [pref, setPref] = useState({ locale: 'en', timezone: 'UTC', preferred_currency: 'USD' })

  useEffect(() => {
    (async () => {
      const [{ data: { user } }, ref] = await Promise.all([
        supabase.auth.getUser(),
        fetch('/api/reference').then((r) => r.json()).catch(() => ({ currencies: [] })),
      ])
      setCurrencies(ref.currencies || [])
      if (user) {
        const { data } = await supabase.from('profiles').select('locale, timezone, preferred_currency').eq('id', user.id).single()
        if (data) setPref({ locale: data.locale || 'en', timezone: data.timezone || 'UTC', preferred_currency: data.preferred_currency || 'USD' })
      }
      // best-effort: default the zone to the browser's if still UTC
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        setPref((p) => (p.timezone === 'UTC' && tz ? { ...p, timezone: tz } : p))
      } catch { /* ignore */ }
      setLoading(false)
    })()
  }, []) // eslint-disable-line

  async function save() {
    setSaving(true)
    setMsg(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('profiles').update(pref).eq('id', user.id)
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Regional preferences saved.' })
    setSaving(false)
  }

  const zones = Array.from(new Set([pref.timezone, ...COMMON_ZONES]))
  const sel = 'w-full bg-surface-container-lowest border border-outline-variant/10 px-3 py-2.5 text-on-surface text-sm'

  return (
    <div className="bg-surface-container-low border border-outline-variant/10">
      <div className="px-6 py-4 border-b border-outline-variant/10"><h2 className="cinzel-text text-lg text-on-surface">Regional Preferences</h2></div>
      <div className="px-6 py-6">
        <p className="text-xs text-on-surface-variant/60 mb-5">Amounts show in your currency; times show in your zone. The underlying data is unchanged.</p>
        {loading ? (
          <p className="text-sm text-on-surface-variant/50">Loading…</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1.5 raleway-text">Language</label>
              <select value={pref.locale} onChange={(e) => setPref((p) => ({ ...p, locale: e.target.value }))} className={sel}>
                {SUPPORTED_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABEL[l] || l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1.5 raleway-text">Time zone</label>
              <select value={pref.timezone} onChange={(e) => setPref((p) => ({ ...p, timezone: e.target.value }))} className={sel}>
                {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}{clockIn(z) ? ` · ${clockIn(z)}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1.5 raleway-text">Currency</label>
              <select value={pref.preferred_currency} onChange={(e) => setPref((p) => ({ ...p, preferred_currency: e.target.value }))} className={sel}>
                {(currencies.length ? currencies : [{ code: 'USD', symbol: '$', name: 'US Dollar' }]).map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {msg && <div className={`text-sm px-4 py-2.5 mt-4 ${msg.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-error/10 border border-error/20 text-error'}`}>{msg.text}</div>}
      </div>
      <div className="px-6 py-4 border-t border-outline-variant/10">
        <button onClick={save} disabled={saving || loading} className="liquid-gold-bg text-on-primary font-semibold px-6 py-2.5 text-sm disabled:opacity-50 border-none cursor-pointer raleway-text">
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}
