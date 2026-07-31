-- ============================================================================
--  ATC Ledger — project status "complete"
--  Adds a 'complete' status (used to reveal project profit = contract − cost).
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check check (status in ('active', 'complete', 'archived'));
