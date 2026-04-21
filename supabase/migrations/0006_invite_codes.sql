-- 0006: Invite codes for counselor self-registration.
--
-- Admins issue codes by INSERTing rows directly via the Supabase SQL editor.
-- Example (expires in 30 days):
--
--   insert into public.invite_codes (code, expires_at)
--   values ('WELCOME-2026-ACADEMIC', now() + interval '30 days');
--
-- The /register/counselor API route validates + marks codes used via the
-- service-role admin client; no client ever reads or writes this table
-- directly, so no permissive policies are created.

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.users(id) on delete set null,
  used_by uuid references public.users(id) on delete set null,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invite_codes_code_idx on public.invite_codes (code);

alter table public.invite_codes enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies — table is admin-only.
-- Service-role client bypasses RLS; anonymous/authed clients see nothing.
