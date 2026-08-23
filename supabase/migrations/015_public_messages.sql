create table public_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  interest text not null,
  message text not null,
  source text not null default 'contact_form',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public_messages enable row level security;
