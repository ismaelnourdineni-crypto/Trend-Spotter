create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  customer_email text,
  mode text,
  report text,
  status text,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.purchases enable row level security;
