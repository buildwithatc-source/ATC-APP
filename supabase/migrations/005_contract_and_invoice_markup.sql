-- ============================================================================
--  ATC Invoicer — contract budget (quotation) + invoice markup
--  * Contract budget = the quotation: scope items with quoted & negotiated
--    amounts. Negotiated total = contract sum.
--  * Markup moves off expenses and onto invoices: a global % on the invoice
--    plus a per-line %. They add together.
--  Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Contract budget (quotation) scope items
-- ---------------------------------------------------------------------------

create table if not exists public.contract_items (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  description       text,
  quoted_amount     numeric(14, 2) not null default 0,
  negotiated_amount numeric(14, 2) not null default 0,
  position          int not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists contract_items_project_idx on public.contract_items (project_id);

-- When the quotation is awarded we snapshot the contract sum + date on the project.
alter table public.projects add column if not exists awarded_at timestamptz;

-- ---------------------------------------------------------------------------
--  Invoice markup (global + per-line)
-- ---------------------------------------------------------------------------

alter table public.invoices
  add column if not exists markup_percent numeric(6, 2) not null default 0;

alter table public.invoice_items
  add column if not exists markup_percent numeric(6, 2) not null default 0;

-- ---------------------------------------------------------------------------
--  RLS
-- ---------------------------------------------------------------------------

alter table public.contract_items enable row level security;

do $$
begin
  execute 'drop policy if exists contract_items_authenticated_all on public.contract_items';
  execute 'create policy contract_items_authenticated_all on public.contract_items
           for all to authenticated using (true) with check (true)';
end;
$$;
