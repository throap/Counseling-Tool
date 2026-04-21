-- 0004: Counselors can pin appointments to the top of dashboards.
-- The existing appointments_counselor_update policy already restricts updates
-- to the counselor who owns the appointment, so pin toggles inherit the right
-- scope without a new policy.

alter table public.appointments
  add column if not exists is_pinned boolean not null default false;

create index if not exists appointments_counselor_pinned_idx
  on public.appointments (counselor_id, is_pinned)
  where is_pinned = true;
