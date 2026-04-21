-- 0002: Extended booking form fields on appointments.
-- student_phone is required at the app layer (regex-validated); left nullable
-- here so older rows survive the migration.

alter table public.appointments
  add column if not exists student_phone text,
  add column if not exists reason_category text,
  add column if not exists additional_notes text;

-- Allowed reason categories. Kept open via CHECK rather than enum so it can
-- evolve without table rewrites.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_reason_category_check'
  ) then
    alter table public.appointments
      add constraint appointments_reason_category_check
      check (
        reason_category is null
        or reason_category in (
          'Academic', 'College Prep', 'Personal', 'Career', 'Other'
        )
      );
  end if;
end $$;
