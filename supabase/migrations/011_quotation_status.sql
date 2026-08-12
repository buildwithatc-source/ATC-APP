-- ============================================================================
--  ATC Ledger — quotation status (active / complete / archived)
--  Mirrors the project status so quotations can be filtered by tab. A quotation
--  becomes 'complete' when it is pushed to a project; it can be archived by hand.
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

alter table public.quotations
  add column if not exists status text not null default 'active';

alter table public.quotations drop constraint if exists quotations_status_check;
alter table public.quotations
  add constraint quotations_status_check check (status in ('active', 'complete', 'archived'));

-- Backfill: quotations already pushed to a project are complete.
update public.quotations set status = 'complete' where project_id is not null and status = 'active';
