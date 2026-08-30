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
| `authed/crm.spec.ts` | yes | CRM workflows + partner data isolation |
| `authed/modules.spec.ts` | yes | Phase 2/3 — recruitment, deals, construction, trading, directory, dedup, risk radar, control plane, AI, client portal |

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
E2E_MEMBER_EMAIL=
E2E_MEMBER_PASSWORD=
```

Two partner logins so isolation tests can prove Partner A never sees Partner B's
data. The member login is for the client-portal test (an admin shares a deal, the
member sees it in `/dashboard/portfolio`). Point these at a **staging Supabase
project**, not production — the authed suites create and mutate records.

Each spec / describe block `test.skip`s itself when its credentials are absent,
so the whole `authed/` folder is safe to keep in CI before staging exists.
