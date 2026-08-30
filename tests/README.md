# E2E tests

Playwright. Runs on every push via `.github/workflows/test.yml` and blocks the
merge on red.

## Run locally

```
npm run build          # once, or whenever app code changed
npm run test           # starts `next start` for you, runs everything
npm run test:ui        # Playwright UI mode
npx playwright test tests/smoke.spec.ts   # one file
```

Against an already-running or remote server:

```
E2E_BASE_URL=https://czaah.com npm run test
```

## What's here

| File | Needs auth | Covers |
|---|---|---|
| `smoke.spec.ts` | no | public pages render, auth wall redirects, protected API 401, sitemap |
| `sectors.spec.ts` | no | sector directory filter/search regression guard |
| `authed/**` | yes | CRM workflows (added per phase) — skipped unless credentials are set |

## Authenticated suites

`tests/authed/**` needs pre-seeded test users. Set these (locally in
`.env.test.local`, in CI as repo secrets):

```
E2E_SUPER_ADMIN_EMAIL=
E2E_SUPER_ADMIN_PASSWORD=
E2E_PARTNER_A_EMAIL=
E2E_PARTNER_A_PASSWORD=
E2E_PARTNER_B_EMAIL=
E2E_PARTNER_B_PASSWORD=
```

Two partner logins so isolation tests can prove Partner A never sees Partner B's
data. Point these at a **staging Supabase project**, not production — the authed
suites create and delete records.
