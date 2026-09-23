-- Follow-up to profiles_insert_lockdown: three more policies let a signed-in
-- user approve or publish their own rows, or join chats uninvited. Every app
-- write to these tables goes through the service role (bypasses RLS), so
-- these only narrow what a direct API call with a user token can do.

-- 1. Investment opportunities: approval_status defaults to 'approved', so any
--    signed-in user could insert a published, approved opportunity shown to
--    every approved member. Self-inserted rows must now be unapproved drafts,
--    and a submitter's edit can't approve or publish.
drop policy if exists investments_insert_partner on public.investment_opportunities;
create policy investments_insert_partner on public.investment_opportunities for insert to authenticated
  with check (submitted_by = auth.uid() and status = 'draft' and approval_status = 'pending_approval'
              and approved_by is null and approved_at is null and published_at is null);
drop policy if exists investments_update_partner on public.investment_opportunities;
create policy investments_update_partner on public.investment_opportunities for update to authenticated
  using (submitted_by = auth.uid() and approval_status = 'pending_approval')
  with check (submitted_by = auth.uid() and status = 'draft' and approval_status = 'pending_approval'
              and approved_by is null and approved_at is null and published_at is null);

-- 2. Group chats: any signed-in user could add themselves to any group and
--    then read its messages. Only a super admin or the chat's creator may add.
drop policy if exists gcm_insert on public.group_chat_members;
create policy gcm_insert on public.group_chat_members for insert to authenticated
  with check (is_super_admin() or chat_id in (select id from public.group_chats where created_by = auth.uid()));

-- 3. Developments: an agent/creator could mark their own development
--    verified, featured or published. Their own edits now keep it an
--    unverified, unfeatured draft; admins publish and verify.
drop policy if exists developments_write_own on public.developments;
create policy developments_write_own on public.developments for update to authenticated
  using (agent_id = auth.uid() or created_by = auth.uid())
  with check ((agent_id = auth.uid() or created_by = auth.uid())
              and coalesce(verified, false) = false and coalesce(featured, false) = false and status = 'draft');
