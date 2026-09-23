-- Phase 9: every CZAAH Properties enquiry becomes a lead (additive only).
-- Leads and viewings are private: no client policies, service role only.
-- Each lead links to a CRM contact (crm_contacts, one per email) and, once
-- an admin qualifies it, to a CRM deal (deals + deal_parties).

create sequence if not exists public.property_lead_ref_seq start 1001;

create table if not exists public.property_leads (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('LEAD-' || nextval('public.property_lead_ref_seq')),
  kind text not null check (kind in ('property_enquiry', 'viewing_request', 'investment_enquiry')),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'viewing_booked', 'offer', 'won', 'lost', 'spam')),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (char_length(phone) <= 50),
  message text check (char_length(message) <= 5000),
  listing_id uuid references public.property_listings(id) on delete set null,
  listing_reference text,
  listing_title text,
  country text,
  city text,
  budget_amount numeric,
  budget_currency text,
  property_type text,
  funding text,
  purpose text,
  timeline text,
  source_page text,
  user_id uuid references auth.users(id) on delete set null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists property_leads_created on public.property_leads(created_at desc);
create index if not exists property_leads_status on public.property_leads(status);
create index if not exists property_leads_listing on public.property_leads(listing_id);
create index if not exists property_leads_contact on public.property_leads(contact_id);
create index if not exists property_leads_user on public.property_leads(user_id);

create table if not exists public.property_viewings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.property_leads(id) on delete cascade,
  listing_id uuid references public.property_listings(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled', 'no_show')),
  preferred_date date,
  preferred_slot text,
  scheduled_at timestamptz,
  mode text not null default 'in_person' check (mode in ('in_person', 'video')),
  notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists property_viewings_lead on public.property_viewings(lead_id);
create index if not exists property_viewings_scheduled on public.property_viewings(scheduled_at);

create trigger property_leads_updated_at before update on public.property_leads for each row execute function update_updated_at();
create trigger property_viewings_updated_at before update on public.property_viewings for each row execute function update_updated_at();

alter table public.property_leads enable row level security;
alter table public.property_viewings enable row level security;
revoke all on public.property_leads, public.property_viewings from anon, authenticated;
revoke all on sequence public.property_lead_ref_seq from anon, authenticated;
