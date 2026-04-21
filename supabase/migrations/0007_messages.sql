-- 0007: Direct messaging between students and counselors.
-- Threading via parent_message_id (self-FK); NULL on the first message in a
-- thread. Eligibility ("students message counselors only; counselors message
-- students they have/had appointments with") is enforced in the API route;
-- RLS here guards read/write scopes only.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  subject text not null,
  body text not null,
  read boolean not null default false,
  parent_message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint messages_sender_not_recipient check (sender_id <> recipient_id)
);

create index if not exists messages_recipient_read_idx
  on public.messages (recipient_id, read, created_at desc);
create index if not exists messages_sender_idx
  on public.messages (sender_id, created_at desc);
create index if not exists messages_parent_idx
  on public.messages (parent_message_id);

alter table public.messages enable row level security;

drop policy if exists messages_participants_read on public.messages;
create policy messages_participants_read on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists messages_sender_insert on public.messages;
create policy messages_sender_insert on public.messages
  for insert with check (sender_id = auth.uid());

-- Recipients mark messages read (update the `read` column). Senders cannot
-- edit their sent messages after-the-fact.
drop policy if exists messages_recipient_update on public.messages;
create policy messages_recipient_update on public.messages
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
