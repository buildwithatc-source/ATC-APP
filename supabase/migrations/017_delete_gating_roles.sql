-- ============================================================================
--  Delete gating via a lightweight profile role.
--  Paste this whole file into the Supabase SQL editor and run it once.
--
--  Why: every table's RLS was `for all to authenticated using(true)`, meaning
--  ANY logged-in account could DELETE every invoice, client, project, etc. This
--  splits that blanket rule so read/insert/update stay open to the whole team,
--  but DELETE is limited to admins. That caps the damage a single compromised
--  or careless account can do (mass wipe of financial records).
--
--  Non-breaking: all EXISTING profiles are backfilled to 'admin', so current
--  users keep deleting exactly as before. Only NEW accounts default to 'member'.
--  Promote a teammate later with:
--    update public.profiles set role = 'admin' where username = 'their-name';
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Role column on profiles (default 'member'; existing rows -> 'admin').
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'member'
    check (role in ('admin', 'member'));

-- Backfill: everyone who already exists is a full admin so nothing breaks today.
update public.profiles set role = 'admin' where role <> 'admin';

-- ---------------------------------------------------------------------------
--  is_admin(): true when the current auth user has the admin role.
--  SECURITY DEFINER + fixed search_path so it reads profiles regardless of the
--  caller's own RLS view, and can't be redirected by a hostile search_path.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
--  Rebuild policies on every app table: SELECT/INSERT/UPDATE open to any
--  authenticated user (unchanged), DELETE restricted to admins.
--  Drops whatever policies currently exist on each table first, so this is
--  idempotent regardless of the original policy names.
-- ---------------------------------------------------------------------------

do $$
declare
  t   text;
  pol record;
  app_tables text[] := array[
    'profiles', 'business', 'clients', 'invoices', 'invoice_items',
    'projects', 'expenses', 'budget_categories', 'contract_items',
    'quotations', 'quotation_items', 'scope_templates', 'suppliers',
    'payment_methods'
  ];
begin
  foreach t in array app_tables loop
    -- Clear existing policies on this table.
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;

    -- Reads/writes stay open to the whole team...
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update', t);

    -- ...but deletes are admins only.
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      t || '_delete', t);
  end loop;
end;
$$;
