# CounselConnect

A full-stack scheduling app that lets students book counseling sessions and
gives counselors tools to manage availability, track appointments, and message
students.

## Features

### For students
- Sign up with email, student ID, school, and SVCte course
- Browse and search counselors by name or department
- **Multi-step booking** — contact info → counselor + time + reason → review
- **Calendar view** — see open slots across one counselor or all counselors side-by-side (color-coded), click to book
- Cancel appointments with a required reason (10 words minimum); a warning shows if the appointment is less than an hour away
- **Messaging** — start or continue conversations with any counselor; unread badge in the nav

### For counselors
- **Self-register** with an admin-issued invite code (`/register/counselor`)
- Set recurring weekly availability blocks (day, start/end, slot duration)
- **Time Off tab** — block specific dates or windows; existing-appointment warning
- Dashboard overview — time-based greeting, pinned appointments, today's list, this-week summary, unread messages, and quick stats
- Appointments page with **pin toggle** (📌) and URL-param filters (student name, date, reason category, status)
- Cancel with the same 10-word reason + urgent-email rules as students
- **Messaging** — reply to any student; compose is limited to students you have or had an appointment with

### Shared
- Resend email on booking, cancellation (with `[URGENT]` prefix if <1 hour away), and new messages
- Row Level Security enforced at the database level
- Double-booking prevented by a unique index on active slots

## Tech stack
- Next.js 14 (App Router) + TypeScript
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS
- `react-big-calendar` + `date-fns` for the student calendar
- Resend for transactional email

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # required for /signup and /register/counselor
RESEND_API_KEY=...                     # required for email notifications
RESEND_FROM_EMAIL=Counseling <no-reply@yourschool.edu>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run the schema and migrations

In the Supabase SQL editor, run in order:

1. `supabase/schema.sql` (base schema + RLS)
2. Every file in `supabase/migrations/` in order (0001 → 0007)

Each migration is idempotent — safe to re-run.

### 4. Seed sample data (optional)

```bash
npm run seed
```

Creates sample counselors, availability, and student accounts for testing.

### 5. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

## Generating counselor invite codes

Counselors register themselves at `/register/counselor` using an invite code.
To issue one, run this in the Supabase SQL editor:

```sql
insert into public.invite_codes (code, expires_at)
values ('INVITE-XXXX', now() + interval '7 days');
```

You can share the code out of band (email, chat). The code is single-use and
expires at the timestamp above.

## Project layout

```
src/
├── app/
│   ├── api/                        # API routes (booking, cancel, signup, messages, register/counselor)
│   ├── login/
│   ├── signup/                     # student self-registration
│   ├── register/counselor/         # counselor self-registration with invite code
│   ├── student/
│   │   ├── dashboard/              # browse counselors
│   │   ├── book/                   # 3-step booking flow (supports ?counselorId=&date=&time= prefill)
│   │   ├── calendar/               # react-big-calendar with single/all-counselors toggle
│   │   ├── appointments/           # upcoming + past, cancel dialog
│   │   └── messages/
│   └── counselor/
│       ├── dashboard/              # hero + pinned + today + week + unread + quick stats
│       ├── availability/           # weekly schedule + Time Off tab
│       ├── appointments/           # pin toggle + URL-param filters
│       └── messages/
├── components/
│   ├── ui/                         # Button, Card, Input/Textarea/Select, Badge, Modal
│   └── messaging/                  # MessagingView shared by student + counselor messages pages
├── lib/
│   ├── supabase/                   # browser + server + admin clients + auth middleware
│   ├── slots.ts                    # slot generator (availability − booked − unavailable)
│   ├── email.ts                    # Resend templates (booking, cancellation, new message)
│   └── messages.ts                 # conversation grouping helper
├── types/                          # table-specific types
└── middleware.ts                   # protects /student and /counselor routes
```

## Security

- Every protected route (`/student/*`, `/counselor/*`) checks session via `requireRole()`
- Row Level Security enforces scope at the database level — users cannot read or mutate data outside their role
- `SUPABASE_SERVICE_ROLE_KEY` is server-only; never shipped to the client
- Messaging role-pair enforcement is done server-side in `/api/messages/send` in addition to RLS (students can only message counselors; counselors can only message students they have/had an appointment with)
- Invite codes are validated server-side with the service-role client so RLS can lock the table to admin-only writes

## License
MIT
