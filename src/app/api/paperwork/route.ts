import { NextRequest, NextResponse } from 'next/server'
import { paperworkForms } from '@/lib/data/paperwork'

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sector = searchParams.get('sector')

  let forms = paperworkForms

  if (sector) {
    forms = forms.filter(
      (f) => f.sector.toLowerCase() === sector.toLowerCase()
    )
  }

  return NextResponse.json({ forms, total: forms.length })
}
