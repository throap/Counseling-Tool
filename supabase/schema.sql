-- School counseling appointment scheduler schema
-- Run once against a fresh Supabase project.

create extension if not exists "pgcrypto";

-- =========================
-- Tables
-- =========================

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  student_id text unique,
  role text not null check (role in ('student', 'counselor')),
  created_at timestamptz not null default now()
);

create table if not exists public.counselors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bio text,
  department text not null,
  photo_url text
);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null default 30 check (slot_duration_minutes > 0),
  check (end_time > start_time)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  counselor_id uuid not null references public.counselors(id) on delete cascade,
  appointment_date date not null,
  start_time time not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'completed')),
  reason text,
  created_at timestamptz not null default now()
);

-- Only one active (booked) session per counselor/date/time. Cancelled rows do not block rebooking.
create unique index if not exists appointments_unique_active_slot
  on public.appointments (counselor_id, appointment_date, start_time)
  where status = 'booked';

create index if not exists availability_counselor_day_idx
  on public.availability (counselor_id, day_of_week);

create index if not exists appointments_counselor_date_idx
  on public.appointments (counselor_id, appointment_date);

create index if not exists appointments_student_date_idx
  on public.appointments (student_id, appointment_date);

-- =========================
-- Helpers
-- =========================

create or replace function public.current_counselor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.counselors where user_id = auth.uid();
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- =========================
-- RLS
-- =========================

alter table public.users enable row level security;
alter table public.counselors enable row level security;
alter table public.availability enable row level security;
alter table public.appointments enable row level security;

-- users: readable by self; counselors may read student rows they have appointments with
drop policy if exists users_self_read on public.users;
create policy users_self_read on public.users
  for select using (id = auth.uid());

drop policy if exists users_counselor_read_students on public.users;
create policy users_counselor_read_students on public.users
  for select using (
    exists (
      select 1 from public.appointments a
      where a.student_id = users.id
        and a.counselor_id = public.current_counselor_id()
    )
  );

drop policy if exists users_self_insert on public.users;
create policy users_self_insert on public.users
  for insert with check (id = auth.uid());

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update using (id = auth.uid());

-- counselors: publicly readable; only the owning user may modify their own row
drop policy if exists counselors_public_read on public.counselors;
create policy counselors_public_read on public.counselors
  for select using (true);

drop policy if exists counselors_self_write on public.counselors;
create policy counselors_self_write on public.counselors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- availability: public read; only the owning counselor may write their own rows
drop policy if exists availability_public_read on public.availability;
create policy availability_public_read on public.availability
  for select using (true);

drop policy if exists availability_counselor_write on public.availability;
create policy availability_counselor_write on public.availability
  for all
  using (counselor_id = public.current_counselor_id())
  with check (counselor_id = public.current_counselor_id());

-- appointments: students manage their own, counselors manage their own
drop policy if exists appointments_student_read on public.appointments;
create policy appointments_student_read on public.appointments
  for select using (student_id = auth.uid());

drop policy if exists appointments_counselor_read on public.appointments;
create policy appointments_counselor_read on public.appointments
  for select using (counselor_id = public.current_counselor_id());

drop policy if exists appointments_student_insert on public.appointments;
create policy appointments_student_insert on public.appointments
  for insert
  with check (
    student_id = auth.uid()
    and public.current_role() = 'student'
  );

drop policy if exists appointments_student_update on public.appointments;
create policy appointments_student_update on public.appointments
  for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists appointments_counselor_update on public.appointments;
create policy appointments_counselor_update on public.appointments
  for update
  using (counselor_id = public.current_counselor_id())
  with check (counselor_id = public.current_counselor_id());
