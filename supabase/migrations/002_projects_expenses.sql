-- ============================================================================
--  ATC Invoicer — Projects & Expenses
--  Adds project tracking (tied to a client) and per-project expenses that can
--  be billed onto invoices. Paste into the Supabase SQL editor and run once.
--  Idempotent: safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Tables
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  client_id   uuid references public.clients (id) on delete restrict,
  description text,
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now()
);

create index if not exists projects_client_id_idx on public.projects (client_id);

-- Link invoices to a project (optional).
alter table public.invoices
  add column if not exists project_id uuid references public.projects (id) on delete set null;

create index if not exists invoices_project_id_idx on public.invoices (project_id);

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  description  text,
  amount       numeric(12, 2) not null default 0,
  expense_date date not null default (now() at time zone 'Asia/Manila')::date,
  invoiced     boolean not null default false,
  invoice_id   uuid references public.invoices (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists expenses_project_id_idx on public.expenses (project_id);
create index if not exists expenses_invoiced_idx on public.expenses (invoiced);

-- ---------------------------------------------------------------------------
--  Row Level Security — single-team app: authenticated users can do anything.
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.expenses enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['projects', 'expenses']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated_all', t
    );
  end loop;
end;
$$;
