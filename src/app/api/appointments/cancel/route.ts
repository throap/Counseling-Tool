import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendCancellationNotice } from "@/lib/email";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { appointmentId?: string } | null;
  if (!body?.appointmentId) {
    return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, status, student_id, counselor_id, student:users!appointments_student_id_fkey(id, name, email), counselor:counselors!appointments_counselor_id_fkey(id, user:users!counselors_user_id_fkey(id, name, email))",
    )
    .eq("id", body.appointmentId)
    .single();

  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (appt.status !== "booked") {
    return NextResponse.json({ error: "Appointment is not active" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appt.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const student = Array.isArray(appt.student) ? appt.student[0] : appt.student;
  const counselor = Array.isArray(appt.counselor) ? appt.counselor[0] : appt.counselor;
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
    });
  }

  return NextResponse.json({ ok: true });
}
