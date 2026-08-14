-- ============================================================================
--  ATC Ledger — expense "mode of payment"
--  A per-expense payment method (stored as text on the expense), chosen from a
--  reusable list. payment_methods holds the presets + any custom ones added
--  from the expense form. Paste into the Supabase SQL editor and run once.
--  Idempotent.
-- ============================================================================

alter table public.expenses
  add column if not exists paid_via text;

create table if not exists public.payment_methods (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness so 'Cash' and 'cash' don't both get added.
create unique index if not exists payment_methods_name_uidx
  on public.payment_methods (lower(name));

alter table public.payment_methods enable row level security;
do $$
begin
  execute 'drop policy if exists payment_methods_authenticated_all on public.payment_methods';
  execute 'create policy payment_methods_authenticated_all on public.payment_methods '
       || 'for all to authenticated using (true) with check (true)';
end;
$$;

-- Seed common presets (safe to re-run — unique index dedupes).
insert into public.payment_methods (name)
values ('Cash'), ('GCash'), ('Bank transfer'), ('Check'), ('Credit card')
on conflict do nothing;
