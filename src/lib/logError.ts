/**
 * Structured error logging for API routes and server code.
 *
 * Emits one JSON line to console.error — the Cloudflare Workers runtime
 * captures these, and they can be shipped anywhere via Logpush. When a
 * SENTRY_DSN is set we also forward to Sentry's HTTP ingest (no SDK, so it
 * stays edge-safe and dependency-free).
 *
 * Usage in a route:
 *   } catch (err) {
 *     logError('mail.threads.reply', err, { threadId, userId })
 *     return NextResponse.json({ error: 'Could not send reply.' }, { status: 500 })
 *   }
 */

type Context = Record<string, string | number | boolean | null | undefined>

export function logError(scope: string, err: unknown, context: Context = {}): void {
  const e = err instanceof Error ? err : new Error(String(err))
  const entry = {
    level: 'error',
    scope,
    message: e.message,
    stack: e.stack,
    ...context,
    at: new Date().toISOString(),
  }

  // Always: structured line for Workers logs / Logpush.
  console.error(JSON.stringify(entry))

  // Optional: forward to Sentry if configured. Fire-and-forget; never let
  // logging failure affect the response.
  const dsn = process.env.SENTRY_DSN
  if (dsn) {
    forwardToSentry(dsn, scope, e, context).catch(() => {})
  }
}

async function forwardToSentry(dsn: string, scope: string, e: Error, context: Context): Promise<void> {
  // dsn: https://<key>@<host>/<projectId>
  const m = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/)
  if (!m) return
  const [, key, host, projectId] = m
  const url = `https://${host}/api/${projectId}/store/`

  const body = {
    logger: scope,
    level: 'error',
    platform: 'javascript',
    timestamp: Date.now() / 1000,
    environment: process.env.NEXT_PUBLIC_ENV || 'production',
    exception: {
      values: [{ type: e.name, value: e.message, stacktrace: { frames: parseStack(e.stack) } }],
    },
    tags: { scope },
    extra: context,
  }

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=czaah-edge/1.0`,
    },
    body: JSON.stringify(body),
  })
}

function parseStack(stack?: string) {
  if (!stack) return []
  return stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const m = line.match(/at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?/)
      if (!m) return { function: line.trim() }
      return { function: m[1] || '<anonymous>', filename: m[2], lineno: Number(m[3]), colno: Number(m[4]) }
    })
    .reverse()
}
