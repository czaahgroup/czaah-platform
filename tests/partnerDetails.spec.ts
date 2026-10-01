import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cleanPartnerDetails, emailChangeNotice } from '@/lib/partnerDetails'

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

  test('both addresses are told, and nothing typed becomes markup', () => {
    const who = { name: 'Sam <b>Khan</b>', oldEmail: 'old@example.com', newEmail: 'new@example.com' }
    const toNew = emailChangeNotice('new', who)
    const toOld = emailChangeNotice('old', who)
    expect(toNew.subject).toBe(toOld.subject)
    expect(toNew.html).toContain('new@example.com')
    expect(toNew.html).toContain('https://czaah.com/login')
    expect(toOld.html).toContain('can no longer be used to sign in')
    expect(toOld.html).not.toContain('https://czaah.com/login')
    for (const mail of [toNew, toOld]) {
      expect(mail.html).toContain('Sam &lt;b&gt;Khan&lt;/b&gt;')
      expect(mail.html).not.toContain('<b>Khan</b>')
      expect(mail.html).toContain('Your password has not changed')
    }
    const route = readFileSync(join(__dirname, '..', 'src/app/api/admin/partners/[id]/route.ts'), 'utf8')
    expect(route).toContain("Promise.all([send('old'), send('new')])")
  })

  test('only a super admin can change them, and the login email moves with the profile', () => {
    const route = readFileSync(join(__dirname, '..', 'src/app/api/admin/partners/[id]/route.ts'), 'utf8')
    expect(route).toContain("profile.role !== 'super_admin'")
    expect(route).toContain('auth.admin.updateUserById(partner.profile_id, { email: details.email, email_confirm: true })')
    expect(route).toContain("action: 'partner_details_updated'")
  })
})
