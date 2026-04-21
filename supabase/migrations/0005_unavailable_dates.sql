-- 0005: Counselor time-off / unavailable dates.
-- full_day=true means the whole date is blocked. Otherwise start_time/end_time
-- must be set and the slot generator subtracts [start_time, end_time).

create table if not exists public.unavailable_dates (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors(id) on delete cascade,
  date date not null,
  full_day boolean not null default true,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  constraint unavailable_dates_time_range_check check (
    (full_day = true and start_time is null and end_time is null)
    or (full_day = false and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists unavailable_dates_counselor_date_idx
  on public.unavailable_dates (counselor_id, date);

alter table public.unavailable_dates enable row level security;

-- Public read: students need to see every counselor's blocked windows to hide slots.
drop policy if exists unavailable_dates_public_read on public.unavailable_dates;
create policy unavailable_dates_public_read on public.unavailable_dates
  for select using (true);

-- Only the owning counselor may write their own rows.
drop policy if exists unavailable_dates_counselor_write on public.unavailable_dates;
create policy unavailable_dates_counselor_write on public.unavailable_dates
  for all
  using (counselor_id = public.current_counselor_id())
  with check (counselor_id = public.current_counselor_id());
