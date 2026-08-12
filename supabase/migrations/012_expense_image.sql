-- ============================================================================
--  ATC Ledger — expense image link
--  One optional Google Drive (or any) image link per expense, shown as a small
--  paperclip/photo chip beside the row. No file upload — just the pasted link.
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

alter table public.expenses
  add column if not exists image_url text;
