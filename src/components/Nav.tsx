import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

async function unreadMessageCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  return count ?? 0;
}

export default async function Nav({ role }: { role: "student" | "counselor" }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const unread = user ? await unreadMessageCount(user.id) : 0;

  const studentLinks = [
    { href: "/student/dashboard", label: "Counselors" },
    { href: "/student/calendar", label: "Calendar" },
    { href: "/student/appointments", label: "Appointments" },
    { href: "/student/messages", label: "Messages", unread },
  ];
  const counselorLinks = [
    { href: "/counselor/dashboard", label: "Dashboard" },
    { href: "/counselor/availability", label: "Availability" },
    { href: "/counselor/appointments", label: "Appointments" },
    { href: "/counselor/messages", label: "Messages", unread },
  ];
  const links = role === "student" ? studentLinks : counselorLinks;

  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-serif text-xl tracking-tight">
            CounselConnect
          </Link>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80">
            {role}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="relative rounded-md px-3 py-1.5 font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              {l.label}
              {"unread" in l && l.unread !== undefined && l.unread > 0 && (
                <span
                  title="Unread messages — refreshes on page load"
                  className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[color:var(--color-warning)] px-1.5 text-[10px] font-semibold text-white"
                >
                  {l.unread}
                </span>
              )}
            </Link>
          ))}
          {user && (
            <>
              <span className="ml-2 hidden text-xs text-white/60 sm:inline">
                {user.email}
              </span>
              <SignOutButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
