import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logError } from '@/lib/logError'


export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { factorId } = body

    if (!factorId) {
      return NextResponse.json({ error: 'factorId is required' }, { status: 400 })
    }

    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: { unenrolled: true } })
  } catch (err) {
    logError("api.auth.mfa.unenroll", err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
