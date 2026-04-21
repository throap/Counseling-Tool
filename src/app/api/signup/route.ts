import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

interface Body {
  firstName?: string;
  lastName?: string;
  schoolName?: string;
  svcteCourse?: string;
  email?: string;
  studentId?: string;
  password?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;

  if (
    !body?.firstName ||
    !body.lastName ||
    !body.schoolName ||
    !body.svcteCourse ||
    !body.email ||
    !body.studentId ||
    !body.password
  ) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

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

  const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`;

  const { error: insertError } = await admin.from("users").insert({
    id: created.user.id,
    name: fullName,
    first_name: body.firstName.trim(),
    last_name: body.lastName.trim(),
    school_name: body.schoolName,
    svcte_course: body.svcteCourse,
    email: body.email.trim(),
    student_id: body.studentId.trim(),
    role: "student",
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
