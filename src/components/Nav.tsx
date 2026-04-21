import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function Nav({ role }: { role: "student" | "counselor" }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const studentLinks = [
    { href: "/student/dashboard", label: "Counselors" },
    { href: "/student/appointments", label: "My Appointments" },
  ];
  const counselorLinks = [
    { href: "/counselor/dashboard", label: "This Week" },
    { href: "/counselor/availability", label: "Availability" },
    { href: "/counselor/appointments", label: "All Appointments" },
  ];
  const links = role === "student" ? studentLinks : counselorLinks;

  return (
    <header className="bg-brand text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold">
            School Counseling
          </Link>
          <span className="rounded bg-white/15 px-2 py-0.5 text-xs uppercase tracking-wide">
            {role}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded px-3 py-1.5 hover:bg-white/10"
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <span className="hidden text-white/70 sm:inline">| {user.email}</span>
              <SignOutButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
