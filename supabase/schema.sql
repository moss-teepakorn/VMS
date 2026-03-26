create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'resident' check (role in ('admin', 'resident')),
  phone text,
  house_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  house_number text not null unique,
  owner_name text not null,
  phone text,
  area_sqm numeric(10, 2) check (area_sqm is null or area_sqm >= 0),
  status text not null default 'vacant' check (status in ('occupied', 'vacant', 'pending')),
  monthly_fee numeric(12, 2) not null default 2750,
  outstanding_amount numeric(12, 2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_houses_status on public.houses(status);
create index if not exists idx_houses_number on public.houses(house_number);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_houses_updated_at on public.houses;
create trigger trg_houses_updated_at
before update on public.houses
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.houses enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "houses_read_authenticated" on public.houses;
create policy "houses_read_authenticated"
on public.houses
for select
to authenticated
using (true);

drop policy if exists "houses_write_admin" on public.houses;
create policy "houses_write_admin"
on public.houses
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active = true
  )
);
