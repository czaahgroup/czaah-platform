-- Phase 10: a "Verified" badge on a listing or development must be backed by
-- a record of who verified it, when, and what was checked (brief: only
-- admin/super admin can approve verification badges). Additive only.
alter table public.property_listings
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_checks jsonb,
  add column if not exists verification_notes text;
alter table public.developments
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_checks jsonb,
  add column if not exists verification_notes text;

-- Whatever path flips `verified`, the timestamp follows it, and removing
-- verification clears who/what so a stale record can't back a new badge.
create or replace function public.stamp_verification() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.verified is distinct from old.verified then
    if coalesce(new.verified, false) then
      new.verified_at := now();
    else
      new.verified_at := null;
      new.verified_by := null;
      new.verification_checks := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists property_listings_stamp_verification on public.property_listings;
create trigger property_listings_stamp_verification before insert or update of verified on public.property_listings
  for each row execute function public.stamp_verification();
drop trigger if exists developments_stamp_verification on public.developments;
create trigger developments_stamp_verification before insert or update of verified on public.developments
  for each row execute function public.stamp_verification();
