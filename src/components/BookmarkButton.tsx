'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// The only way anything ever ends up in /dashboard/bookmarks — a sector or
// service detail page renders this so a logged-in member can save it.
export function BookmarkButton({ type, id }: { type: 'sector' | 'service'; id: string }) {
  const supabase = createClient()
  const column = type === 'sector' ? 'sector_id' : 'service_id'
  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarkId, setBookmarkId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('member_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq(column, id)
        .maybeSingle()
      if (!cancelled) {
        setBookmarkId(data?.id || null)
        setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function toggle() {
    if (!userId || busy) return
    setBusy(true)
    if (bookmarkId) {
      await supabase.from('member_bookmarks').delete().eq('id', bookmarkId)
      setBookmarkId(null)
    } else {
      const { data } = await supabase
        .from('member_bookmarks')
        .insert({ user_id: userId, [column]: id })
        .select('id')
        .single()
      setBookmarkId(data?.id || null)
    }
    setBusy(false)
  }

  if (loading || !userId) return null

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-2 font-[family-name:var(--font-body)] text-sm tracking-wide uppercase transition-colors disabled:opacity-50"
      style={{
        background: 'transparent',
        border: '1px solid rgba(201,168,76,0.3)',
        color: bookmarkId ? '#C9A84C' : 'rgba(255,255,255,0.5)',
        padding: '8px 16px',
        cursor: busy ? 'default' : 'pointer',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
        {bookmarkId ? 'bookmark' : 'bookmark_border'}
      </span>
      {bookmarkId ? 'Bookmarked' : 'Bookmark'}
    </button>
  )
}
