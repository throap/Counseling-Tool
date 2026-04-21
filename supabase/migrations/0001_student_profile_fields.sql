-- 0001: Add student profile fields to users table.
-- Introduced with the /signup self-registration page.
-- Safe to run multiple times.

alter table public.users
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists school_name text,
  add column if not exists svcte_course text;
