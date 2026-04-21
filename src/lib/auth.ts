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
    redirect(profile.role === "counselor" ? "/counselor/dashboard" : "/student/dashboard");
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
