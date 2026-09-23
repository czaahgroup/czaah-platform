import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanRegistration, savedSearchName, cleanSearchPath, accountUrl, accountLink } from '@/lib/buyerAccount'

test('registration is trimmed, lower-cased and validated', () => {
  expect(cleanRegistration({ full_name: ' Sam ', email: ' Sam@Example.COM ', password: 'longenough' }).data)
    .toEqual({ full_name: 'Sam', email: 'sam@example.com', password: 'longenough' })
  expect(cleanRegistration({ full_name: '', email: 'a@b.co', password: 'longenough' }).error).toMatch(/name/)
  expect(cleanRegistration({ full_name: 'x', email: 'nope', password: 'longenough' }).error).toMatch(/email/)
  expect(cleanRegistration({ full_name: 'x', email: 'a@b.co', password: 'short' }).error).toMatch(/8 characters/)
  expect(cleanRegistration(null).error).toBeTruthy()
})

test('a registration can never choose a role or status', () => {
  const r = cleanRegistration({ full_name: 'x', email: 'a@b.co', password: 'longenough', role: 'super_admin', status: 'approved' })
  expect(Object.keys(r.data!)).toEqual(['full_name', 'email', 'password'])
})

test('account links go to the clean property address', () => {
  expect(accountUrl('property.czaah.com', 'https://property.czaah.com')).toBe('https://property.czaah.com/account')
  expect(accountUrl('czaah.com', 'https://czaah.com')).toBe('https://czaah.com/property-portal/account')
  expect(accountLink('https://property.czaah.com/account', 'confirm', 'a b')).toBe('https://property.czaah.com/account?confirm=a%20b')
})

test('saved search names read like the search', () => {
  expect(savedSearchName('/property-portal/buy/pakistan/lahore', 'type=commercial&price=0-250000')).toBe('For sale · Lahore · Pakistan · commercial · up to $250,000')
  expect(savedSearchName('/property-portal/rent', 'beds=2&price=500000-1000000')).toBe('To rent · 2+ beds · $500,000–$1,000,000')
  expect(savedSearchName('/property-portal/listings', 'with_yield=1&sort=yield-desc')).toBe('Properties · with a stated yield')
  expect(savedSearchName('/property-portal/buy', 'price=3000000-')).toBe('For sale · $3,000,000+')
})

test('only portal search pages can be saved', () => {
  expect(cleanSearchPath('/property-portal/buy/pakistan?type=land')).toBe('/property-portal/buy/pakistan?type=land')
  expect(cleanSearchPath('/property-portal/rent')).toBe('/property-portal/rent')
  expect(cleanSearchPath('https://evil.example/buy')).toBeNull()
  expect(cleanSearchPath('//evil.example/property-portal/buy')).toBeNull()
  expect(cleanSearchPath('/admin/users')).toBeNull()
  expect(cleanSearchPath('/property-portal/buy/../../admin')).toBeNull()
  expect(cleanSearchPath(42)).toBeNull()
})

test('the middleware lets buyer sign-up through and routes buyers to their account', () => {
  const mw = readFileSync(join(__dirname, '..', 'src', 'middleware.ts'), 'utf8')
  expect(mw).toContain("pathname === '/api/property-account/register'")
  expect(mw).toContain("pathname === '/api/property-account/forgot'")
  // Deleting an account needs a session: it must not be public.
  expect(mw).not.toMatch(/pathname === '\/api\/property-account'\s*\|\|/)
  expect(mw).toContain("user.user_metadata?.account_type === 'buyer'")
})
