# CRM Phase 1 — status

Roadmap: https://claude.ai/code/artifact/7a048bf8-bbb5-47ce-a78a-4a1f0e7cc559

## Done

### P1A — Foundation
- **Tests + CI gate** — Playwright (`playwright.config.ts`, `tests/`), `.github/workflows/test.yml` blocks merges on red. 67 no-auth tests + a skipped authed suite (`tests/authed/`).
- **RLS audit** (`docs/rls-matrix.md`) — RLS on all 52 tables. Fixed a **critical privilege-escalation hole** (`profiles` column grants, migration `20260830000004`). Two lower findings logged.
- **Index audit** — schema was already well-indexed; added a few list/board composites (`20260830000005`).
- **Error logging** — `src/lib/logError.ts` (structured logs + optional Sentry). `docs/observability.md`.
- **Backups** — see "Needs you" below.

### P1B — Data model (`20260830000006` + `20260830000007`)
`crm_companies`, `crm_contacts`, `crm_tasks`, `crm_notes`, `crm_links` + enums. RLS + SELECT-only grants (writes are service-role). Backfilled from `company_name` fields, `mail_contacts`, partner accounts, and approved members. `src/lib/activity.ts` — `logActivity()`.

### P1C — Workspace
Admin **CRM** section: Overview · Contacts · Companies · Lead Board · Pipeline · Tasks.
- Contacts/companies: list (filter, search, paginate), create, detail with inline edit.
- Contact tabs: Overview · Emails · Notes · Tasks · Activity (activity merges audit log + notes + tasks + linked mail threads).
- Lead Board: enquiries kanban. Pipeline: partner-opportunity kanban with weighted totals.
- Tasks: quick-add, grouped by overdue/today/week.
- API: `/api/crm/{contacts,companies,notes,tasks,timeline,search,lookup}` + `contacts/[id]/emails`. Scoped via `src/lib/crmAuth.ts`.
- **Partner mirror**: `/partner-network/crm` — own contacts + tasks, auto-scoped.

### P1D — Dashboard
`/admin/crm/dashboard` — KPI grid, 14-day leads sparkline (inline SVG), pipeline-by-stage bars, 30-day email volume, needs-attention list. `/api/admin/overview` expanded (superset — legacy `/admin` page untouched).

### P1E — Email ↔ records (`20260830000009`)
Trigger on `mailbox_threads` insert auto-links a thread to a contact by sender address (both inbound paths) + backfill. "Emails" tab on the contact, incl. **compose email from the record** (picks a mailbox, sends via `/api/mail/threads`, auto-links).

### Documents & search (`20260830000010`)
`crm_documents` table + private `crm-documents` storage bucket. `/api/crm/documents` — signed upload URL, metadata record (activity-logged), list with signed download URLs, delete. **Files tab** on the contact. `/admin/crm/search` — cross-entity search page.

### New-email notifications (`20260830000011`)
Trigger on inbound `mailbox_messages` notifies the mailbox's owning partner (or all super_admins for a team mailbox).

### P1F — Notifications & reminders
- New-lead admin notification (pre-existing) + `enquiry.created` activity event.
- Task-assigned notification. `notification_type` += `task_reminder`, `task_assigned` (`20260830000008`).
- `/api/crm/tasks/reminders` + `.github/workflows/task-reminders.yml.disabled` (parked — needs `CRON_SECRET`).

## Needs you

| Item | Why |
|---|---|
| **Upgrade Supabase to Pro** | The production DB has **no backups**. Free plan = no daily snapshots, no PITR. |
| **Enable R2 + secrets** | To turn on `.github/workflows/backup.yml.disabled` (independent weekly `pg_dump`). See `docs/backups.md`. |
| **Staging Supabase + `E2E_*` secrets** | Activates `tests/authed/**` — locks the CRM workflows + partner-isolation with automated tests. See `tests/README.md`. |
| **`CRON_SECRET`** (worker + repo secret) | To enable task reminders. |
| **Sentry DSN** (optional) | Error alerts. |
| Delete inactive Supabase project `uzkpritwklqdxxhmcarp` | Leftover. |

## Not done — needs a human, not code

- **Mobile:** built responsive (`overflow-x-auto` tables/boards + tab rows, responsive grids, `mx-4` modals) but not tested on real devices.
- **Cross-browser QA** on real Chrome / Safari / Firefox / Edge / iOS.
- **Load test** of the dashboard + list endpoints under production traffic.
- `mail_contacts` still exists alongside `crm_contacts` (both maintained by the backfill/trigger) — retire when the mail ContactPanel reads from `crm_contacts`. Low value.
- ~21 route files with non-standard `console.error` shapes (`console.log`, `err.message` args) — the codemod handled the other 186.

## Then

AI features — only after Phase 1 is signed off.
