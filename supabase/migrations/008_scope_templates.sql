-- ============================================================================
--  ATC Invoicer — scope-item templates (Quick add)
--  Reusable scope-item names for the quotation Quick-add checklist. You can add
--  your own, and they persist for all future quotations. Seeded with defaults.
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

create table if not exists public.scope_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.scope_templates enable row level security;

do $$
begin
  execute 'drop policy if exists scope_templates_authenticated_all on public.scope_templates';
  execute 'create policy scope_templates_authenticated_all on public.scope_templates
           for all to authenticated using (true) with check (true)';
end;
$$;

insert into public.scope_templates (name, position)
select v.name, v.pos
from (values
  ('Salary', 1),
  ('Material', 2),
  ('Demolition', 3),
  ('Hauling of debris', 4),
  ('Painting', 5),
  ('Installation work', 6)
) as v(name, pos)
where not exists (select 1 from public.scope_templates where public.scope_templates.name = v.name);
