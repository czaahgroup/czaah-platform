import { test, expect } from '@playwright/test'
import { seedPortalRuntime } from '@/app/property-portal/_components/portalRuntime'
import { whatsappHref, phoneHref, listingReference } from '@/app/property-portal/_components/PropertyActions'
import { validateSection, PORTAL_DEFAULTS } from '@/lib/portalContent'

const listing = { id: '0b1e2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', title: 'Canary Wharf — Grade-A Office Floor' }

test('Call and WhatsApp stay hidden until CZAAH numbers are set', () => {
  expect(PORTAL_DEFAULTS.offices.phone).toBe('')
  expect(PORTAL_DEFAULTS.offices.whatsapp).toBe('')
  seedPortalRuntime({ offices: { offices: [], email: 'info@czaah.com', phone: '', whatsapp: '' } } as never)
  expect(phoneHref()).toBeNull()
  expect(whatsappHref(listing)).toBeNull()
})

test('with numbers set, the links are well-formed and carry the listing', () => {
  seedPortalRuntime({ offices: { offices: [], email: 'info@czaah.com', phone: '+44 (20) 1234-5678', whatsapp: '+44 7700 900000' } } as never)
  expect(phoneHref()).toBe('tel:+442012345678')
  const wa = whatsappHref(listing)!
  expect(wa.startsWith('https://wa.me/447700900000?text=')).toBe(true)
  const text = decodeURIComponent(wa.split('text=')[1])
  expect(text).toContain(listing.title)
  expect(text).toContain(listingReference(listing.id))
  expect(text).toContain(`/${listing.id}`)
})

test('references are short, stable and derived from the id', () => {
  expect(listingReference(listing.id)).toBe('CZ-0B1E2C3D')
  expect(listingReference(listing.id)).toBe(listingReference(listing.id))
})

test('admin rejects numbers that are not phone numbers', () => {
  const ok = validateSection('offices', { offices: [], email: 'info@czaah.com', phone: '+44 20 1234 5678', whatsapp: '' })
  expect(ok).toEqual([])
  const bad = validateSection('offices', { offices: [], email: 'info@czaah.com', phone: 'call us', whatsapp: '123' })
  expect(bad).toHaveLength(2)
})
