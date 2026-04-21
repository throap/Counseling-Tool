"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function generateInviteCode(
  code: string,
  expiresAt: string,
): Promise<{ success?: true; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const normalizedCode = code.trim();
  if (!normalizedCode) return { error: "Invite code cannot be empty." };

  const { error } = await supabase.from("invite_codes").insert({
    code: normalizedCode,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "That code already exists. Try a different one." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/invite-codes");
  return { success: true };
}
