-- ============================================================================
--  ATC Invoicer — quotation add-ons
--  Supervision & profit % (of the scope subtotal) and contingencies %
--  (of the supervision & profit amount). The grand total is:
--    scope_subtotal + supervision + contingencies
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

alter table public.quotations
  add column if not exists supervision_percent numeric(6, 2) not null default 0;

alter table public.quotations
  add column if not exists contingency_percent numeric(6, 2) not null default 0;
