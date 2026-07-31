-- ============================================================================
--  ATC Invoicer — quotation notes
--  Free-text notes shown on the printed quotation (e.g. the SCOPE line).
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

alter table public.quotations add column if not exists notes text;
