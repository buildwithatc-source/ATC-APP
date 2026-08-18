-- Per-invoice display option: when false, the invoice shows one summary line per
-- category (the category's total) instead of the itemized breakdown. Some clients
-- want the detail, some just want category totals. Display-only — totals are the
-- same either way. Existing invoices default to itemized (current behavior).
alter table invoices add column if not exists itemized boolean not null default true;
