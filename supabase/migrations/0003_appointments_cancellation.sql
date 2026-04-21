-- 0003: Audit columns for two-sided cancellation with required reason.

alter table public.appointments
  add column if not exists cancelled_by text,
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_cancelled_by_check'
  ) then
    alter table public.appointments
      add constraint appointments_cancelled_by_check
      check (cancelled_by is null or cancelled_by in ('student', 'counselor'));
  end if;
end $$;
