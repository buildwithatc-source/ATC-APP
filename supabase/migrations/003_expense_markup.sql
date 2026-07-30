-- ============================================================================
--  ATC Invoicer — expense markup
--  Adds a per-expense markup percentage. The billable (client-facing) amount
--  is cost * (1 + markup_percent/100); the raw `amount` stays your cost.
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

alter table public.expenses
  add column if not exists markup_percent numeric(6, 2) not null default 0;
