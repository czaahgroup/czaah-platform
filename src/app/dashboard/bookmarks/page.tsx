'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Bookmark { id: string; sector_id: string | null; service_id: string | null; product_id: string | null; created_at: string }
interface SectorInfo { id: string; name: string; slug: string; description: string | null }
interface ServiceInfo { id: string; name: string; slug: string; description: string | null }
interface ProductInfo { id: string; name: string; slug: string; description: string | null; sector_id: string | null; service_id: string | null }
type BookmarkType = 'sectors' | 'services' | 'products'

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [sectors, setSectors] = useState<Record<string, SectorInfo>>({})
  const [services, setServices] = useState<Record<string, ServiceInfo>>({})
  const [products, setProducts] = useState<Record<string, ProductInfo>>({})
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<BookmarkType>('sectors')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: bmarks } = await supabase.from('member_bookmarks').select('id, sector_id, service_id, product_id, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
      const allBookmarks = bmarks || []
      setBookmarks(allBookmarks)
      const sectorIds = [...new Set(allBookmarks.map(b => b.sector_id).filter(Boolean))] as string[]
      if (sectorIds.length > 0) { const { data } = await supabase.from('sectors').select('id, name, slug, description').in('id', sectorIds); if (data) setSectors(Object.fromEntries(data.map(s => [s.id, s]))) }
      const serviceIds = [...new Set(allBookmarks.map(b => b.service_id).filter(Boolean))] as string[]
      if (serviceIds.length > 0) { const { data } = await supabase.from('services').select('id, name, slug, description').in('id', serviceIds); if (data) setServices(Object.fromEntries(data.map(s => [s.id, s]))) }
      const productIds = [...new Set(allBookmarks.map(b => b.product_id).filter(Boolean))] as string[]
      if (productIds.length > 0) { const { data } = await supabase.from('products').select('id, name, slug, description, sector_id, service_id').in('id', productIds); if (data) setProducts(Object.fromEntries(data.map(p => [p.id, p]))) }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function removeBookmark(bookmarkId: string) {
    setRemoving(bookmarkId)
    await supabase.from('member_bookmarks').delete().eq('id', bookmarkId)
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
    setRemoving(null)
  }

  const sectorBookmarks = bookmarks.filter(b => b.sector_id)
  const serviceBookmarks = bookmarks.filter(b => b.service_id)
  const productBookmarks = bookmarks.filter(b => b.product_id)
  const tabs: { key: BookmarkType; label: string; count: number }[] = [
    { key: 'sectors', label: 'Sectors', count: sectorBookmarks.length },
    { key: 'services', label: 'Services', count: serviceBookmarks.length },
    { key: 'products', label: 'Products', count: productBookmarks.length },
  ]

  if (loading) return <div className="flex items-center justify-center py-20"><div className="raleway-text text-on-surface-variant/50">Loading...</div></div>

  return (
    <>
      <div className="mb-6"><h1 className="cinzel-text text-2xl text-on-surface">Bookmarks</h1></div>
      <div className="flex gap-2 overflow-x-auto mb-6">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-1.5 text-sm whitespace-nowrap transition-colors raleway-text ${activeTab === tab.key ? 'liquid-gold-bg text-on-primary font-semibold' : 'bg-surface-container border border-outline-variant/10 text-on-surface-variant hover:text-on-surface'}`}>{tab.label} ({tab.count})</button>
        ))}
      </div>
      <div className="bg-surface-container-low border border-outline-variant/10">
        {activeTab === 'sectors' && (sectorBookmarks.length === 0 ? <EmptyState message="No sector bookmarks yet." browseHref="/sectors" browseLabel="Browse Sectors" /> : <div className="divide-y divide-outline-variant/10">{sectorBookmarks.map((b) => { const sector = b.sector_id ? sectors[b.sector_id] : null; return <BookmarkRow key={b.id} name={sector?.name || 'Unknown Sector'} description={sector?.description} href={sector ? `/sectors/${sector.slug}` : '#'} date={b.created_at} removing={removing === b.id} onRemove={() => removeBookmark(b.id)} /> })}</div>)}
        {activeTab === 'services' && (serviceBookmarks.length === 0 ? <EmptyState message="No service bookmarks yet." browseHref="/sectors" browseLabel="Browse Services" /> : <div className="divide-y divide-outline-variant/10">{serviceBookmarks.map((b) => { const service = b.service_id ? services[b.service_id] : null; return <BookmarkRow key={b.id} name={service?.name || 'Unknown Service'} description={service?.description} href={service ? `/services/${service.slug}` : '#'} date={b.created_at} removing={removing === b.id} onRemove={() => removeBookmark(b.id)} /> })}</div>)}
        {activeTab === 'products' && (productBookmarks.length === 0 ? <EmptyState message="No product bookmarks yet." browseHref="/sectors" browseLabel="Browse Products" /> : <div className="divide-y divide-outline-variant/10">{productBookmarks.map((b) => { const product = b.product_id ? products[b.product_id] : null; return <BookmarkRow key={b.id} name={product?.name || 'Unknown Product'} description={product?.description} href={product ? `/products/${product.slug}` : '#'} date={b.created_at} removing={removing === b.id} onRemove={() => removeBookmark(b.id)} /> })}</div>)}
      </div>
    </>
  )
}

function EmptyState({ message, browseHref, browseLabel }: { message: string; browseHref: string; browseLabel: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-on-surface-variant/50 mb-4 raleway-text">{message}</p>
      <Link href={browseHref} className="inline-block liquid-gold-bg text-on-primary font-semibold px-6 py-2.5 text-sm no-underline raleway-text">{browseLabel} &rarr;</Link>
    </div>
  )
}

function BookmarkRow({ name, description, href, date, removing, onRemove }: { name: string; description: string | null | undefined; href: string; date: string; removing: boolean; onRemove: () => void }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Link href={href} className="text-sm font-medium text-on-surface hover:text-primary transition-colors no-underline raleway-text">{name}</Link>
        {description && <p className="text-xs text-on-surface-variant/40 mt-1 truncate max-w-md raleway-text">{description}</p>}
        <p className="text-xs text-on-surface-variant/40 mt-1 raleway-text">Bookmarked {new Date(date).toLocaleDateString()}</p>
      </div>
      <button onClick={onRemove} disabled={removing} className="text-xs text-error hover:text-error/80 transition-colors disabled:opacity-50 shrink-0 bg-transparent border-none cursor-pointer raleway-text">{removing ? 'Removing...' : 'Remove'}</button>
    </div>
  )
}
