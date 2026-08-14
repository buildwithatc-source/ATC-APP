-- ============================================================================
--  ATC Ledger — suppliers + per-expense supplier link
--  Suppliers mirror clients (name / address / contact). Each expense may point
--  at one supplier. Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

create table if not exists public.suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  address        text,
  contact_number text,
  created_at     timestamptz not null default now()
);

alter table public.expenses
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

create index if not exists expenses_supplier_idx on public.expenses (supplier_id);

-- RLS: any authenticated user has full access (same policy shape as clients).
alter table public.suppliers enable row level security;
do $$
begin
  execute 'drop policy if exists suppliers_authenticated_all on public.suppliers';
  execute 'create policy suppliers_authenticated_all on public.suppliers '
       || 'for all to authenticated using (true) with check (true)';
end;
$$;
