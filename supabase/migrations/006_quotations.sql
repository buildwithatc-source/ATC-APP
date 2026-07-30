-- ============================================================================
--  ATC Invoicer — standalone Quotations
--  A quotation is created first (its own QTN<YEAR><NNN> number). When pushed to
--  a project it creates the project (ATC code), copies its scope items into the
--  project's contract budget, and links to it (project_id set) — after which it
--  drops out of the open quotation list.
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

create table if not exists public.quotations (
  id           uuid primary key default gen_random_uuid(),
  code         text,
  year         int,
  quotation_no int,
  client_id    uuid references public.clients (id) on delete restrict,
  title        text,
  -- Set when the quotation is pushed to a project (then it's hidden from the list).
  project_id   uuid references public.projects (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists quotations_client_idx on public.quotations (client_id);
create index if not exists quotations_project_idx on public.quotations (project_id);
create unique index if not exists quotations_year_no_uidx on public.quotations (year, quotation_no);
create unique index if not exists quotations_code_uidx on public.quotations (code);

create table if not exists public.quotation_items (
  id                uuid primary key default gen_random_uuid(),
  quotation_id      uuid not null references public.quotations (id) on delete cascade,
  description       text,
  quoted_amount     numeric(14, 2) not null default 0,
  negotiated_amount numeric(14, 2) not null default 0,
  position          int not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists quotation_items_q_idx on public.quotation_items (quotation_id);

-- Smallest unused quotation number for a year (gap-filled, like projects).
create or replace function public.next_quotation_no(p_year int)
returns int
language sql
security definer
set search_path = public
as $$
  select coalesce(min(s.g), 1)
  from generate_series(
    1,
    (select count(*) + 1 from public.quotations where year = p_year)
  ) as s(g)
  where not exists (
    select 1 from public.quotations where year = p_year and quotation_no = s.g
  );
$$;

grant execute on function public.next_quotation_no(int) to authenticated;

-- RLS
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['quotations', 'quotation_items']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated_all', t
    );
  end loop;
end;
$$;
