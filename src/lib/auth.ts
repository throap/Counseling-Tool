import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Role } from "./types";

export interface SessionProfile {
  userId: string;
  role: Role;
  name: string;
  email: string;
  studentId: string | null;
  counselorId: string | null;
}

export async function requireRole(role: Role): Promise<SessionProfile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, student_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  if (profile.role !== role) {
    if (profile.role === "counselor") redirect("/counselor/dashboard");
    if (profile.role === "admin") redirect("/admin/invite-codes");
    redirect("/student/dashboard");
  }

  let counselorId: string | null = null;
  if (profile.role === "counselor") {
    const { data: counselor } = await supabase
      .from("counselors")
      .select("id")
      .eq("user_id", user.id)
      .single();
    counselorId = counselor?.id ?? null;
  }

  return {
    userId: profile.id,
    role: profile.role,
    name: profile.name,
    email: profile.email,
    studentId: profile.student_id,
    counselorId,
  };
}

/**
 * Silently redirect non-admins to the landing page. Returns the admin's
 * userId. "Security through obscurity" is fine here — the admin console is
 * not a secret, but we don't advertise the route or the role to others.
 */
export async function requireAdmin(): Promise<{ userId: string; name: string; email: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/");

  return { userId: profile.id, name: profile.name, email: profile.email };
}
