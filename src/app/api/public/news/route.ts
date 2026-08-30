import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logError'


export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || 'Pakistan investment business economy'
    const page = request.nextUrl.searchParams.get('page') || '1'
    const pageSize = request.nextUrl.searchParams.get('pageSize') || '8'

    const apiKey = process.env.NEWS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'News API not configured' }, { status: 500 })
    }

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&page=${page}&pageSize=${pageSize}&apiKey=${apiKey}`

    const response = await fetch(url, {
      // NewsAPI rejects requests with no User-Agent — the Workers runtime,
      // unlike Node, does not set one by default.
      headers: { 'User-Agent': 'czaah.com (+https://czaah.com)' },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    const data = await response.json()

    return NextResponse.json(data)
  } catch (err) {
    logError("api.public.news", err)
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}
