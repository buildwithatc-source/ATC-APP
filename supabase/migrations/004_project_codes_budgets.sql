-- ============================================================================
--  ATC Invoicer — project codes + budgets
--  * Auto project code ATC<YEAR><NNN> (e.g. ATC2026001), gap-filling per year.
--  * Contract budget + sub-budget categories, with expenses assignable to a
--    category so spend can be tracked against each budget.
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Project code + contract budget
-- ---------------------------------------------------------------------------

alter table public.projects add column if not exists year int;
alter table public.projects add column if not exists project_no int;
alter table public.projects add column if not exists code text;
alter table public.projects
  add column if not exists contract_budget numeric(14, 2) not null default 0;

-- Backfill code/year/project_no for any existing projects (sequential per year).
with ranked as (
  select
    id,
    extract(year from (created_at at time zone 'Asia/Manila'))::int as yr,
    row_number() over (
      partition by extract(year from (created_at at time zone 'Asia/Manila'))::int
      order by created_at
    ) as rn
  from public.projects
  where code is null
)
update public.projects p
set year = r.yr,
    project_no = r.rn,
    code = 'ATC' || r.yr::text || lpad(r.rn::text, 3, '0')
from ranked r
where p.id = r.id;

create unique index if not exists projects_year_no_uidx on public.projects (year, project_no);
create unique index if not exists projects_code_uidx on public.projects (code);

-- Smallest unused project number for a year (so deleted projects free their number).
create or replace function public.next_project_no(p_year int)
returns int
language sql
security definer
set search_path = public
as $$
  select coalesce(min(s.g), 1)
  from generate_series(
    1,
    (select count(*) + 1 from public.projects where year = p_year)
  ) as s(g)
  where not exists (
    select 1 from public.projects where year = p_year and project_no = s.g
  );
$$;

grant execute on function public.next_project_no(int) to authenticated;

-- ---------------------------------------------------------------------------
--  Budget categories + expense assignment
-- ---------------------------------------------------------------------------

create table if not exists public.budget_categories (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  name          text not null,
  budget_amount numeric(14, 2) not null default 0,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists budget_categories_project_idx on public.budget_categories (project_id);

alter table public.expenses
  add column if not exists category_id uuid references public.budget_categories (id) on delete set null;

create index if not exists expenses_category_idx on public.expenses (category_id);

-- ---------------------------------------------------------------------------
--  RLS
-- ---------------------------------------------------------------------------

alter table public.budget_categories enable row level security;

do $$
begin
  execute 'drop policy if exists budget_categories_authenticated_all on public.budget_categories';
  execute 'create policy budget_categories_authenticated_all on public.budget_categories
           for all to authenticated using (true) with check (true)';
end;
$$;
