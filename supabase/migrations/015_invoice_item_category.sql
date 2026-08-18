-- Group invoice line items under a category header (e.g. "Materials" → Paint,
-- Flooring). The category is free text copied from the expense's budget
-- category when pulled in, and editable per line. Display-only: it does not
-- affect totals. Existing items get NULL (rendered as ungrouped).
alter table invoice_items add column if not exists category text;
