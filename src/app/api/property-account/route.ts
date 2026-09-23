import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logError'

/**
 * DELETE: a buyer deletes their own CZAAH Properties account. Saved
 * properties and searches go with it (ON DELETE CASCADE).
 *
 * Only a buyer-only login can be deleted here. Anyone with a profiles row —
 * members, partners, admins — is refused: their account holds far more than
 * portal preferences and is closed through CZAAH, not a button.
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle()
    if (profile) {
      return NextResponse.json({ error: 'This login is also a CZAAH member or partner account. Please contact CZAAH to close it.' }, { status: 403 })
    }
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    logError('api.property-account.delete', err)
    return NextResponse.json({ error: 'We could not delete your account just now. Please try again.' }, { status: 500 })
  }
}
