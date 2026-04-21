// Counselor self-registration via invite code.
//
// To generate a new counselor invite code, run in the Supabase SQL Editor:
//
//   insert into public.invite_codes (code, expires_at)
//   values ('INVITE-XXXX', now() + interval '7 days');
//
// (created_by/used_by are optional foreign keys — they can be null for
// admin-issued codes, and we fill used_by when the code is redeemed.)

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface Body {
  fullName?: string;
  email?: string;
  password?: string;
  inviteCode?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;

  if (!body?.fullName?.trim() || !body.email?.trim() || !body.password || !body.inviteCode?.trim()) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Validate invite code. We use the admin client so RLS doesn't hide the row.
  const { data: invite } = await admin
    .from("invite_codes")
    .select("id, code, used_by, expires_at")
    .eq("code", body.inviteCode.trim())
    .maybeSingle();

  if (!invite || invite.used_by) {
    return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 400 });
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 400 });
  }

  // Create auth user.
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: body.email.trim(),
    password: body.password,
    email_confirm: true,
  });
  if (authError || !created.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Could not create account." },
      { status: 400 },
    );
  }

  const fullName = body.fullName.trim();
  const [firstName, ...rest] = fullName.split(/\s+/);
  const lastName = rest.join(" ") || null;

  const { error: userInsertError } = await admin.from("users").insert({
    id: created.user.id,
    name: fullName,
    first_name: firstName ?? null,
    last_name: lastName,
    email: body.email.trim(),
    role: "counselor",
  });
  if (userInsertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: userInsertError.message }, { status: 400 });
  }

  const { error: counselorInsertError } = await admin.from("counselors").insert({
    user_id: created.user.id,
    bio: null,
    department: "Unassigned",
    photo_url: null,
  });
  if (counselorInsertError) {
    await admin.from("users").delete().eq("id", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: counselorInsertError.message }, { status: 400 });
  }

  await admin
    .from("invite_codes")
    .update({ used_by: created.user.id, used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
