create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_username_length check (char_length(trim(username)) >= 3)
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_users(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  user_agent text
);

create index if not exists admin_sessions_user_id_idx on public.admin_sessions(user_id);
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions(expires_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_touch_updated_at on public.admin_users;
create trigger trg_admin_users_touch_updated_at
before update on public.admin_users
for each row execute function public.touch_updated_at();

alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;

drop policy if exists admin_users_no_access on public.admin_users;
create policy admin_users_no_access
on public.admin_users
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists admin_sessions_no_access on public.admin_sessions;
create policy admin_sessions_no_access
on public.admin_sessions
for all
to anon, authenticated
using (false)
with check (false);

-- ESEMPIO: crea il primo utente staff.
-- Cambia username e password prima di eseguire.
-- insert into public.admin_users (username, password_hash, role)
-- values ('staff', crypt('CAMBIA-QUESTA-PASSWORD', gen_salt('bf', 12)), 'admin')
-- on conflict (username) do update
-- set password_hash = excluded.password_hash,
--     role = excluded.role,
--     is_active = true;
