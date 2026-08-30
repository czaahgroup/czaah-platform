# Observability — P1A

## Error logging

`src/lib/logError.ts` — `logError(scope, err, context?)`.

- Always writes one structured JSON line to `console.error`. The Cloudflare
  Workers runtime captures these; ship them anywhere with **Logpush**
  (Cloudflare dashboard &rarr; the Worker &rarr; Logs &rarr; Logpush) or read
  them live with `wrangler tail`.
- If `SENTRY_DSN` is set (Worker secret), it also forwards the exception to
  Sentry's HTTP ingest — no SDK, edge-safe, fire-and-forget.

### Pattern for API routes

```ts
import { logError } from '@/lib/logError'

export async function POST(req: NextRequest) {
  try {
    // ...
  } catch (err) {
    logError('api.<area>.<verb>', err, { userId, recordId })
    return NextResponse.json({ error: 'Human-readable message.' }, { status: 500 })
  }
}
```

Scope is `api.<area>.<verb>` (e.g. `api.enquiries.post`, `api.mail.threads.reply`).
Put identifiers in `context` — never the whole request body, never secrets.

Wired so far: `api.contact.post`, `api.enquiries.post`, `api.enquiries.get`,
`api.admin.overview`. The remaining ~110 routes get migrated from bare
`console.error` incrementally; **all new routes use `logError` from the start.**

## Turning on Sentry (optional)

1. Create a free Sentry project (platform: Node / JavaScript).
2. Copy the DSN (`https://<key>@<host>/<projectId>`).
3. Add it as a Worker secret: `npx wrangler secret put SENTRY_DSN`, and to
   `.dev.vars` for local.

Nothing else changes — `logError` picks it up.
