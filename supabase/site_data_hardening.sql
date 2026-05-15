-- Hardening for public.site_data
-- Goal:
-- 1. Keep public read access
-- 2. Block all client-side writes
-- 3. Allow writes only through service_role / Edge Function

alter table public.site_data enable row level security;

drop policy if exists site_data_public_read on public.site_data;
drop policy if exists site_data_no_insert on public.site_data;
drop policy if exists site_data_no_update on public.site_data;
drop policy if exists site_data_no_delete on public.site_data;

create policy site_data_public_read
on public.site_data
for select
to anon, authenticated
using (id = 1);

create policy site_data_no_insert
on public.site_data
for insert
to anon, authenticated
with check (false);

create policy site_data_no_update
on public.site_data
for update
to anon, authenticated
using (false)
with check (false);

create policy site_data_no_delete
on public.site_data
for delete
to anon, authenticated
using (false);
