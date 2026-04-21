# Counseling-Tool
Team O 
A full-stack web application that allows students to browse school counselors, view available appointment times, and book or cancel counseling sessions — while giving counselors tools to manage their own availability and appointments.

✨ Features
For Students

🔐 Secure login with student ID and email
🔍 Browse and search counselors by name or department
📅 View real-time available time slots by week
✅ Book 30-minute counseling sessions
❌ Cancel upcoming appointments
📧 Receive email confirmations for bookings and cancellations

For Counselors

🗓️ Set recurring weekly availability
📋 View and manage upcoming appointments
✔️ Mark sessions as completed
📧 Get notified by email when students book or cancel


🛠️ Tech Stack
LayerTechnologyWhyFrameworkNext.js 14 (App Router)Full-stack React with built-in routing and APILanguageTypeScriptType safety across the entire codebaseDatabaseSupabase (PostgreSQL)Auth, database, and Row Level Security in oneStylingTailwind CSSFast, responsive, utility-first stylingEmailResendReliable transactional email APIDeploymentVercelZero-config deployment for Next.js

🗃️ Database Schema
users           → id, name, email, student_id, role (student | counselor), created_at
counselors      → id, user_id, bio, department, photo_url
availability    → id, counselor_id, day_of_week, start_time, end_time, slot_duration_minutes
appointments    → id, student_id, counselor_id, appointment_date, start_time, status, reason, created_at
Row Level Security (RLS) rules:

Students can only read and write their own appointments
Counselors can only read appointments assigned to them
Availability is publicly readable so students can see open slots
Double-booking is prevented at the database level with a unique constraint on (counselor_id, appointment_date, start_time)


🗺️ Pages & Routes
RouteRoleDescription/loginBothShared login with role-based redirect/student/dashboardStudentBrowse and search counselors/student/book/[counselorId]StudentView slots and book an appointment/student/appointmentsStudentView, manage, and cancel bookings/counselor/dashboardCounselorWeekly view of upcoming appointments/counselor/availabilityCounselorSet recurring weekly availability/counselor/appointmentsCounselorFull appointment history

🚀 Getting Started
Prerequisites

Node.js 18+
A Supabase account (free)
A Resend account (free)

1. Clone the repository
bashgit clone https://github.com/YOUR_USERNAME/counselconnect.git
cd counselconnect
2. Install dependencies
bashnpm install
3. Set up environment variables
Create a .env.local file in the root of the project:
envNEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key

⚠️ Never commit .env.local to version control. It is already listed in .gitignore.

4. Set up the database
Run the SQL schema file in your Supabase dashboard (SQL Editor):
bash# Schema file is located at:
/supabase/schema.sql
5. Seed sample data (optional)
bashnpm run seed
This creates 3 sample counselors, their weekly availability, and 2 student accounts for testing.
6. Run the development server
bashnpm run dev
Open http://localhost:3000 in your browser.

📧 Email Notifications
This app uses Resend to send transactional emails. Students receive a confirmation when they book or cancel, and counselors are notified of any changes to their schedule.
To test emails locally, create a free Resend account and add your API key to .env.local. You can send to any email address from the Resend sandbox.

🔒 Security

All routes are protected by Supabase Auth session checks
Row Level Security (RLS) is enforced at the database level — users cannot access data that isn't theirs even if they manipulate API calls
Student IDs are validated against the users table on login
Environment variables are never exposed to the client (service role key is server-only)


📁 Project Structure
counselconnect/
├── app/                    # Next.js App Router pages
│   ├── login/
│   ├── student/
│   │   ├── dashboard/
│   │   ├── book/[counselorId]/
│   │   └── appointments/
│   └── counselor/
│       ├── dashboard/
│       ├── availability/
│       └── appointments/
├── components/             # Reusable UI components
├── lib/                    # Supabase client, utility functions
├── supabase/               # Schema SQL and seed script
└── types/                  # TypeScript types for DB tables

🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

Fork the repository
Create a feature branch (git checkout -b feature/your-feature)
Commit your changes (git commit -m 'Add your feature')
Push to the branch (git push origin feature/your-feature)
Open a Pull Request


📄 License
This project is licensed under the MIT License.

🙏 Acknowledgements
Built for school counseling departments to make mental health and academic support more accessible to students.
