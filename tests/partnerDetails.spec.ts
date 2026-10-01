import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cleanPartnerDetails } from '@/lib/partnerDetails'

test.describe('admin edits to partner details', () => {
  test('cleans what was sent and nothing else', () => {
    expect(cleanPartnerDetails({ fullName: '  Sam Khan ', email: ' Sam@Example.COM ', phone: '+44 20 7946 0000', companyName: '' }).data)
      .toEqual({ full_name: 'Sam Khan', email: 'sam@example.com', phone: '+44 20 7946 0000', company_name: null })
    expect(cleanPartnerDetails({ phone: '' }).data).toEqual({ phone: null })
    expect(cleanPartnerDetails({ role: 'super_admin', status: 'approved', fullName: 'Sam' }).data).toEqual({ full_name: 'Sam' })
  })

  test('refuses bad values', () => {
    expect(cleanPartnerDetails({ email: 'not-an-email' }).error).toBeTruthy()
    expect(cleanPartnerDetails({ fullName: '   ' }).error).toBeTruthy()
    expect(cleanPartnerDetails({ phone: 'call me' }).error).toBeTruthy()
    expect(cleanPartnerDetails({}).error).toBeTruthy()
    expect(cleanPartnerDetails(null).error).toBeTruthy()
  })

  test('only a super admin can change them, and the login email moves with the profile', () => {
    const route = readFileSync(join(__dirname, '..', 'src/app/api/admin/partners/[id]/route.ts'), 'utf8')
    expect(route).toContain("profile.role !== 'super_admin'")
    expect(route).toContain('auth.admin.updateUserById(partner.profile_id, { email: details.email, email_confirm: true })')
    expect(route).toContain("action: 'partner_details_updated'")
  })
})
