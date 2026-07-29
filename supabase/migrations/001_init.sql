-- ============================================================================
--  ATC Invoicer — initial schema, RLS, triggers, seeds, invoice numbering
--  Paste this whole file into the Supabase SQL editor and run it once.
--  Single-team app: any authenticated user can read/write all rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Tables
-- ---------------------------------------------------------------------------

-- Display profile per auth user. Keyed 1:1 to auth.users.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text unique,
  full_name  text
);

-- Business identity that feeds the invoice header (single row, editable in Settings).
create table if not exists public.business (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  address_line1      text,
  address_line2      text,
  phone              text,
  email              text,
  logo_url           text,
  payable_to_default text
);

-- Clients billed on invoices.
create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  address        text,
  contact_number text,
  created_at     timestamptz not null default now()
);

-- Invoices.
create table if not exists public.invoices (
  id            uuid primary key default gen_random_uuid(),
  invoice_no    text unique not null,
  client_id     uuid references public.clients (id) on delete restrict,
  payable_to    text,
  project       text,
  invoice_date  date not null default (now() at time zone 'Asia/Manila')::date,
  due_date      date,
  notes         text,
  adjustments   numeric(12, 2) not null default 0,
  subtotal      numeric(12, 2) not null default 0,
  total         numeric(12, 2) not null default 0,
  status        text not null default 'draft'
                  check (status in ('draft', 'sent', 'paid', 'void')),
  created_by    uuid references public.profiles (id) on delete set null
                  default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_invoice_date_idx on public.invoices (invoice_date);

-- Line items. total is auto-computed (qty * unit_price).
create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  position    int not null default 0,
  description text,
  qty         numeric(12, 2) not null default 0,
  unit_price  numeric(12, 2) not null default 0,
  total       numeric(12, 2) generated always as (qty * unit_price) stored
);

create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

-- ---------------------------------------------------------------------------
--  updated_at trigger (invoices)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  Invoice numbering — format YYYYMMDD-N, per-day sequence starting at 1.
--  Concurrency-safe: the atomic upsert on invoice_counters serializes the
--  per-day increment so two callers can never receive the same N.
--  Dates use Asia/Manila (Baguio City) so the number matches the local day.
-- ---------------------------------------------------------------------------

create table if not exists public.invoice_counters (
  day date primary key,
  seq int  not null default 0
);

create or replace function public.next_invoice_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (now() at time zone 'Asia/Manila')::date;
  n int;
begin
  insert into public.invoice_counters (day, seq)
  values (d, 1)
  on conflict (day)
    do update set seq = public.invoice_counters.seq + 1
  returning seq into n;

  return to_char(d, 'YYYYMMDD') || '-' || n::text;
end;
$$;

grant execute on function public.next_invoice_no() to authenticated;

-- ---------------------------------------------------------------------------
--  Auto-create a profile row whenever an auth user is created.
--  username defaults to the email's local part; adjustable later in-app.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that already exist.
insert into public.profiles (id, username, full_name)
select u.id, split_part(u.email, '@', 1), ''
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  Row Level Security — single-team app: authenticated users can do anything.
-- ---------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.business       enable row level security;
alter table public.clients        enable row level security;
alter table public.invoices       enable row level security;
alter table public.invoice_items  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'business', 'clients', 'invoices', 'invoice_items']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated_all', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
--  Seeds
-- ---------------------------------------------------------------------------

-- Business (single row) — only inserted if none exists yet.
insert into public.business (name, address_line1, address_line2, phone, email, payable_to_default)
select
  'Build With ATC',
  '26 A. Mabini St., Victoria Shoppesville',
  'Baguio City, 2600',
  '+63 927 201 9988',
  'buildwithatc@gmail.com',
  'Thomas Nathaniel Ang'
where not exists (select 1 from public.business);

-- Clients.
insert into public.clients (name, address, contact_number)
select v.name, v.address, v.contact_number
from (values
  ('BEANSTALK BISTRO',        null,                                              null),
  ('CITY CENTER HOTEL',       null,                                              null),
  ('VICTORIA BAKERY',         '26 A. Mabini St. Baguio City',                    '074-442-2474'),
  ('87 GUESTHOUSE',           null,                                              null),
  ('TULIPS PLACE RECTO',      null,                                              null),
  ('TULIP APPARTELLE LOAKAN', null,                                              null),
  ('VICTORIA ENTERPRISE',     null,                                              null),
  ('KADANGYAN BY 3BU',        null,                                              null),
  ('3BU HOSTEL',              null,                                              null)
) as v(name, address, contact_number)
where not exists (select 1 from public.clients where public.clients.name = v.name);
