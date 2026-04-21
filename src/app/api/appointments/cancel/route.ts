import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendCancellationNotice } from "@/lib/email";

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    appointmentId?: string;
    reason?: string;
  } | null;

  if (!body?.appointmentId) {
    return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
  }
  const reason = (body.reason ?? "").trim();
  if (wordCount(reason) < 10) {
    return NextResponse.json(
      { error: "Please provide a cancellation reason of at least 10 words." },
      { status: 400 },
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, status, student_id, counselor_id, student:users!appointments_student_id_fkey(id, name, email), counselor:counselors!appointments_counselor_id_fkey(id, user_id, user:users!counselors_user_id_fkey(id, name, email))",
    )
    .eq("id", body.appointmentId)
    .single();

  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appt.status !== "booked") {
    return NextResponse.json({ error: "Appointment is not active" }, { status: 400 });
  }

  // Role-based authorization: only the student on the appointment OR the
  // counselor who owns it can cancel.
  const counselor = Array.isArray(appt.counselor) ? appt.counselor[0] : appt.counselor;
  let cancelledBy: "student" | "counselor" | null = null;
  if (profile.role === "student" && appt.student_id === user.id) {
    cancelledBy = "student";
  } else if (profile.role === "counselor" && counselor?.user_id === user.id) {
    cancelledBy = "counselor";
  }
  if (!cancelledBy) {
    return NextResponse.json({ error: "Not authorized to cancel this appointment" }, { status: 403 });
  }

  // Urgency: less than 1 hour until the appointment starts.
  const apptStart = new Date(`${appt.appointment_date}T${appt.start_time}`);
  const hoursUntil = (apptStart.getTime() - Date.now()) / (1000 * 60 * 60);
  const urgent = hoursUntil < 1;

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_by: cancelledBy,
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appt.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const student = Array.isArray(appt.student) ? appt.student[0] : appt.student;
  const counselorUser = counselor
    ? Array.isArray(counselor.user)
      ? counselor.user[0]
      : counselor.user
    : null;

  if (student?.email && counselorUser?.email) {
    await sendCancellationNotice({
      studentEmail: student.email,
      studentName: student.name,
      counselorEmail: counselorUser.email,
      counselorName: counselorUser.name,
      date: appt.appointment_date,
      startTime: appt.start_time,
      cancelledBy,
      reason,
      urgent,
    });
  }

  return NextResponse.json({ ok: true, urgent });
}
