-- 0008: Add 'admin' role and invite-code RLS so the /admin/invite-codes page
-- can read and insert rows with the admin user's session (no service-role key).
--
-- Seed an admin by running, after an account exists:
--   update public.users set role = 'admin' where email = 'you@school.edu';

-- 1. Extend the users.role CHECK constraint to include 'admin'.
do $$
declare
  existing_name text;
begin
  select con.conname
    into existing_name
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
   where nsp.nspname = 'public'
     and cls.relname = 'users'
     and con.contype = 'c'
     and pg_get_constraintdef(con.oid) ilike '%role%';
  if existing_name is not null then
    execute format('alter table public.users drop constraint %I', existing_name);
  end if;
end $$;

alter table public.users
  add constraint users_role_check
  check (role in ('student', 'counselor', 'admin'));

-- 2. RLS policies for invite_codes that let signed-in admins read and insert.
-- Service-role continues to bypass RLS for the /register/counselor flow.

drop policy if exists invite_codes_admin_read on public.invite_codes;
create policy invite_codes_admin_read on public.invite_codes
  for select
  using (
    exists (
      select 1 from public.users
       where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists invite_codes_admin_insert on public.invite_codes;
create policy invite_codes_admin_insert on public.invite_codes
  for insert
  with check (
    exists (
      select 1 from public.users
       where id = auth.uid() and role = 'admin'
    )
    and created_by = auth.uid()
  );
