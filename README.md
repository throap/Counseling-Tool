# School Counseling Appointment Scheduler

Full-stack Next.js 14 + Supabase app for scheduling counseling sessions at a school. Students browse counselors and book sessions; counselors manage availability and appointments.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Supabase (Auth + Postgres + RLS)
- Tailwind CSS
- Resend (transactional email)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project**
   - From the Supabase dashboard, copy the project URL, anon key, and service-role key.
   - Open the SQL editor and run everything in [supabase/schema.sql](supabase/schema.sql).

3. **Create env file**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only — never expose to the client)
   - `RESEND_API_KEY` (optional — emails are skipped if unset)
   - `RESEND_FROM_EMAIL` (e.g. `Counseling <no-reply@yourschool.edu>`)
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)

4. **Seed sample data**
   ```bash
   npm run seed
   ```
   Creates 3 counselors and 2 students. Default password for all accounts: `Password123!`.

5. **Run**
   ```bash
   npm run dev
   ```

## Seeded accounts

**Counselors**
- `alex.rivera@school.test` — Academic Advising
- `jordan.kim@school.test` — College Prep
- `sam.patel@school.test` — Personal Wellness

**Students**
- `taylor.morgan@school.test` (Student ID `S100001`)
- `casey.nguyen@school.test` (Student ID `S100002`)

## Routes

| Path | Role | Purpose |
| --- | --- | --- |
| `/login` | public | Tabbed login (student / counselor). Students enter a student ID in addition to password. |
| `/student/dashboard` | student | Browse counselors; search by name or department. |
| `/student/book/[counselorId]` | student | Week view of open 30-minute slots; confirm booking with optional reason. |
| `/student/appointments` | student | Upcoming + past appointments; cancel upcoming ones. |
| `/counselor/dashboard` | counselor | This week's bookings grouped by day. |
| `/counselor/availability` | counselor | Add/remove recurring weekly blocks. |
| `/counselor/appointments` | counselor | Full history; mark sessions completed. |

## Architecture notes

- **Role-based access** is enforced in two places:
  1. Middleware (`src/middleware.ts`) redirects unauthenticated requests to `/login`.
  2. `requireRole` (`src/lib/auth.ts`) on every protected page gates by role server-side.
- **Double-booking prevention** relies on a unique partial index on `(counselor_id, appointment_date, start_time) where status = 'booked'` plus RLS-checked inserts from `/api/appointments/book`. Cancelled rows do not block future rebooking.
- **Slot generation** is pure and isolated in `src/lib/slots.ts`, so it can run both server-side (for the booking page) and as part of request validation in the API route.
- **Row-Level Security** policies live in `supabase/schema.sql`. Students can only read/write their own appointments; counselors manage their own appointments and availability; availability is publicly readable so students can see open times.
- **Emails** (`src/lib/email.ts`) no-op gracefully when `RESEND_API_KEY` is unset — useful in local dev.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — run built app
- `npm run typecheck` — TypeScript check
- `npm run lint` — ESLint
- `npm run seed` — populate sample counselors + students
