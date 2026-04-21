import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmation } from "@/lib/email";
import { generateSlots, startOfWeek } from "@/lib/slots";
import type { AvailabilityRow } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    counselorId?: string;
    appointmentDate?: string;
    startTime?: string;
    reason?: string | null;
  } | null;

  if (!body?.counselorId || !body.appointmentDate || !body.startTime) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json({ error: "Only students can book" }, { status: 403 });
  }

  const { data: counselor } = await supabase
    .from("counselors")
    .select("id, user:users!counselors_user_id_fkey(id, name, email)")
    .eq("id", body.counselorId)
    .single();

  if (!counselor) {
    return NextResponse.json({ error: "Counselor not found" }, { status: 404 });
  }

  const { data: availability } = await supabase
    .from("availability")
    .select("id, counselor_id, day_of_week, start_time, end_time, slot_duration_minutes")
    .eq("counselor_id", body.counselorId);

  if (!isValidSlot(body.appointmentDate, body.startTime, (availability ?? []) as AvailabilityRow[])) {
    return NextResponse.json({ error: "Slot is outside of counselor availability" }, { status: 400 });
  }

  // Unique partial index on (counselor_id, appointment_date, start_time) where status='booked'
  // prevents double-booking even under concurrent requests.
  const { data: inserted, error: insertError } = await supabase
    .from("appointments")
    .insert({
      student_id: profile.id,
      counselor_id: body.counselorId,
      appointment_date: body.appointmentDate,
      start_time: body.startTime,
      reason: body.reason ?? null,
      status: "booked",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    const msg =
      insertError?.code === "23505"
        ? "That slot was just taken. Please pick another."
        : insertError?.message ?? "Could not create appointment";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const counselorUser = Array.isArray(counselor.user) ? counselor.user[0] : counselor.user;
  if (counselorUser?.email) {
    await sendBookingConfirmation({
      studentEmail: profile.email,
      studentName: profile.name,
      counselorEmail: counselorUser.email,
      counselorName: counselorUser.name,
      appointmentId: inserted.id,
      date: body.appointmentDate,
      startTime: body.startTime,
      reason: body.reason ?? null,
    });
  }

  return NextResponse.json({ id: inserted.id });
}

function isValidSlot(dateStr: string, startTime: string, avail: AvailabilityRow[]): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const slots = generateSlots(avail, [], startOfWeek(date));
  return slots.some((s) => s.date === dateStr && s.startTime === startTime);
}
