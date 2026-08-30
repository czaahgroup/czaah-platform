# RLS matrix & security audit — P1A

Reviewed 2026-08-30. Covers every table created by the migrations in
`supabase/migrations/`.

## Method

1. Confirmed `ENABLE ROW LEVEL SECURITY` on every created table.
2. Dumped every `CREATE POLICY` and read the `USING` / `WITH CHECK` bodies.
3. Checked the helper functions (`is_super_admin`, `is_admin`, `is_partner`,
   `is_approved`).
4. Grepped the client bundle for direct table writes with the anon key
   (`supabase.from(...).insert|update|delete`) — the only place RLS is the
   sole line of defence. Server routes use the service-role key and bypass RLS,
   so their own authorization checks are what matter there.

## Overall state

- **RLS is enabled on all 52 tables.** No table is exposed unprotected.
- The policy pattern is consistent and sound: `_own` (scoped by `auth.uid()`
  directly, or via `partners.profile_id = auth.uid()`), `_admin`
  (`is_super_admin()`), and INSERT `WITH CHECK` pinning the owner column.
- Helper functions are `SECURITY DEFINER STABLE` and correct.
- Client-side anon writes are limited to: `member_bookmarks` (delete own),
  `notification_preferences` (own), `profiles` (own — see finding 1).

## Findings

### 1 — CRITICAL · fixed in `20260830000004_rls_harden_profiles.sql`

`profiles` UPDATE policy is `WITH CHECK (id = auth.uid())` — row-scoped, not
column-scoped — and `authenticated` holds table-level UPDATE (Supabase default).
A signed-in user could `supabase.from('profiles').update({ role: 'super_admin',
status: 'approved' })` from the browser and elevate.

**Fix:** `REVOKE UPDATE ON profiles FROM authenticated`, then
`GRANT UPDATE (full_name, phone, company_name, company_registration_number,
country, industry_interests, company_website, company_description, avatar_url)`.
`role` / `status` / `email` are now writable only by the service role.

**Regression test owed:** `tests/authed/profile-escalation.spec.ts` — a member
session attempts the update and gets a permission error. Blocked on test
credentials (see `tests/README.md`).

### 2 — MEDIUM · not yet fixed

`enquiries_update_member` is `USING (member_id = auth.uid())` with no
`WITH CHECK` and no column limit. A member could change `status`,
`assigned_admin_id`, or `resolved_at` on their own enquiry via the data API.
No client code does this today (edits go through `/api/enquiries/[id]`), so the
exposure is "a determined user with devtools", not the app.

**Planned fix (P1B migration):** column-grant `enquiries` the same way, or drop
`enquiries_update_member` entirely and require the server route.

### 3 — LOW · inconsistency

`negotiation_messages` (migration `004`) uses `public.get_my_role() = 'admin'`
instead of the `is_admin()` / `is_super_admin()` helpers used everywhere else.
If `get_my_role()` returns the literal role, a `super_admin` is *not* `'admin'`
and would be locked out of managing negotiation messages.

**Action:** confirm `get_my_role()` behaviour; align to
`is_super_admin() OR is_admin()`.

### 4 — LOW · intentional, documented

`workforce_registry`, `oep_registry`, `employer_registry` and
`meeting_participants` have INSERT `WITH CHECK (TRUE)`. The first three are
public self-registration forms (also `GRANT INSERT ... TO anon`), so open insert
is by design. `meeting_participants` open insert lets any authenticated user add
participants to any meeting — low impact, revisit if meetings carry sensitive
context.

## Constraints for later phases (P1B / P1C / P1F)

These fall out of the audit and shape the CRM build:

- **`audit_log`** — INSERT is `is_super_admin() OR is_admin()`, SELECT is
  `is_super_admin()` only. The `logActivity()` helper **must** use the
  service-role client. A partner's activity timeline **cannot** be a direct
  RLS-scoped query — it must be a server endpoint that filters and returns.
- **`notifications`** — INSERT is admin-only. System / automated notifications
  (new-lead alerts, task reminders) **must** be created with the service-role
  client.
- **New `crm_*` tables** — ship RLS + column grants in the same migration.
  Partner scope: `owner_id = auth.uid()` or via `partner_sector_access`. Do not
  rely on `WITH CHECK` alone for anything sensitive — pair it with column
  grants, per finding 1.

## Table-by-table

`own` = row owner via `auth.uid()` (directly or through `partners.profile_id`).
`SA` = super_admin. `A` = assigned/sector admin.

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|
| profiles | own · SA · A(sector) | own | **own (cols only)** · SA | — | finding 1 |
| kyc_documents | own · SA | own | SA | — | |
| sectors / services / products | approved+active · SA | SA | SA | SA | public catalogue |
| investment_opportunities | published · SA · partner(own submission) | SA · partner(own) | SA · partner(own, pending) | SA | |
| investment_documents / images | approved · SA · partner(own opp) | SA · partner(own opp) | SA | SA | |
| enquiries | member(own) · A(assigned) · SA | member(own, approved) | member(own — **wide**) · A · SA | — | finding 2 |
| enquiry_attachments | member(own enq) · A · SA | uploader | — | — | |
| chat_messages | member(non-note) · A(assigned) · SA | sender + role check | read-flag only | — | internal notes hidden from members |
| shared_documents | party · SA | admin sharer | — | — | |
| member_bookmarks | own | own | — | own | anon-client delete OK |
| notification_preferences | own | own | own | — | booleans only, safe |
| notifications | own | admin/system | own (read flag) | — | system inserts need service role |
| audit_log | SA | admin | — | — | see constraints above |
| partners | own · SA | SA | SA | SA | |
| partner_sector_access | own · SA | SA | SA | SA | |
| partner_opportunities | own · SA | own | own (draft/more-info) · SA | SA | |
| partner_opportunity_documents | own opp · SA | own opp | SA | SA | |
| partner_chats / partner_messages | own partner · SA | sender + partner check | participants · SA | — | |
| partner_mailboxes | own partner · SA | SA | SA (signature: own) | SA | webmail cookie path scoped in `requireMailAccess` |
| mailbox_threads / messages / attachments | own mailbox · SA | own mailbox · SA | own mailbox · SA | SA | |
| mailbox_labels / thread_labels | own mailbox · SA | own mailbox · SA | own mailbox · SA | own mailbox · SA | |
| mail_templates | shared or own mailbox · SA | own · SA | own · SA | own · SA | |
| mail_contacts | tied to visible threads · SA | SA | SA | SA | keyed by email, no owner — superseded by `crm_contacts` in P1B |
| mail_ai_events | own mailbox · SA | own mailbox · SA | — | — | |
| meetings / meeting_participants | organizer · participant · SA | authenticated | organizer · SA | — | finding 4 |
| direct_chats / direct_messages | elite · admin · SA | elite · participant | participants · SA | — | elite-member ↔ admin |
| admin_chats / admin_messages | party · SA | party | party · SA | — | |
| group_chats / members / messages | member · SA | member · creator | creator · SA | member-self · creator · SA | |
| broadcasts / broadcast_reads | targeted role · SA | SA | — | — | |
| property_listings | own · approved · admin | own | own (pending) · admin | — | |
| property_chats / messages | party · SA | enquirer / sender | participants · SA | — | |
| workforce_registry / oep_registry / employer_registry | admin · partner(own submission) | **TRUE** + anon | admin | — | finding 4, public forms |
| registrant_chats / messages | own profile · SA | own / sender | participants · SA | — | |
| call_log | caller · receiver · SA | (service) | — | — | |
| negotiation_messages | ? | ? | `get_my_role()='admin'` | — | finding 3 |
| crm_companies | staff · owner · creator | staff (service role) | staff | staff | P1B — authenticated has SELECT only, all writes service-role |
| crm_contacts | staff · owner · creator · own profile | staff | staff | staff | P1B — same |
| crm_tasks | staff · assignee · creator | staff | staff | staff | P1B — same |
| crm_notes | staff · author | staff | staff | staff | P1B — same |
| crm_links | staff · linker | staff | staff | staff | P1B — same |
