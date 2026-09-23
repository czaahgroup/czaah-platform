import { test, expect } from '@playwright/test'
import { safeRedirect } from '@/lib/safeRedirect'
import { escapeHtml } from '@/lib/escapeHtml'
import { safeFileName, sniffImageType, base64Bytes } from '@/lib/uploadSafety'

test.describe('safeRedirect keeps redirects on this site', () => {
  test('same-site paths pass through', () => {
    expect(safeRedirect('/dashboard')).toBe('/dashboard')
    expect(safeRedirect('/reset-password')).toBe('/reset-password')
    expect(safeRedirect('/listings?type=commercial#top')).toBe('/listings?type=commercial#top')
    // Encoding inside a legitimate path is preserved, not decoded.
    expect(safeRedirect('/listings?search=a%26b')).toBe('/listings?search=a%26b')
  })

  test('anything that could leave the site falls back', () => {
    for (const bad of [
      '@evil.com',                 // `${origin}@evil.com` -> evil.com
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '%2F%2Fevil.com',            // encoded //
      'javascript:alert(1)',
      '/ok%0d%0aSet-Cookie:x=1',   // header injection
      '%E0%A4%A',                  // malformed encoding
    ]) {
      expect(safeRedirect(bad), bad).toBe('/')
    }
  })

  test('empty values use the fallback', () => {
    expect(safeRedirect(null)).toBe('/')
    expect(safeRedirect('', '/admin')).toBe('/admin')
  })
})

test.describe('upload safety', () => {
  test('file names cannot climb out of their folder', () => {
    expect(safeFileName('../other-enquiry/contract.pdf')).toBe('contract.pdf')
    expect(safeFileName('..\\..\\x.png')).toBe('x.png')
    expect(safeFileName('/etc/passwd')).toBe('passwd')
    expect(safeFileName('...hidden')).toBe('hidden')
    expect(safeFileName('')).toBe('file')
    expect(safeFileName('Floor plan (v2).pdf')).toBe('Floor plan (v2).pdf')
    expect(safeFileName('a'.repeat(300) + '.pdf').length).toBeLessThanOrEqual(120)
    expect(safeFileName('a'.repeat(300) + '.pdf').endsWith('.pdf')).toBe(true)
  })

  test('image type comes from the bytes, not the label', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
    expect(sniffImageType(new TextEncoder().encode('<html><script>'))).toBeNull()
    expect(sniffImageType(new TextEncoder().encode('%PDF-1.7'))).toBeNull()
  })

  test('base64 size is measured without decoding', () => {
    const bytes = new Uint8Array(1000)
    expect(base64Bytes(Buffer.from(bytes).toString('base64'))).toBe(1000)
  })
})

test('escapeHtml neutralises markup', () => {
  expect(escapeHtml('<a href="x">Hi</a> & \'you\'')).toBe('&lt;a href=&quot;x&quot;&gt;Hi&lt;/a&gt; &amp; &#39;you&#39;')
  expect(escapeHtml(undefined)).toBe('')
  expect(escapeHtml(null)).toBe('')
})
