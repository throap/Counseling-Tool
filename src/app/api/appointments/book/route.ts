import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmation } from "@/lib/email";
import { generateSlots, startOfWeek } from "@/lib/slots";
import type { AvailabilityRow, ReasonCategory } from "@/lib/types";
import type { UnavailableDateRow } from "@/types/unavailable-dates";
import { REASON_CATEGORIES } from "@/lib/types";

const PHONE_REGEX = /^[+]?[\d\s().-]{7,}$/;

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
    studentName?: string;
    studentPhone?: string;
    reasonCategory?: string;
    reason?: string;
    additionalNotes?: string | null;
  } | null;

  if (!body?.counselorId || !body.appointmentDate || !body.startTime) {
    return NextResponse.json({ error: "Missing appointment details." }, { status: 400 });
  }
  if (!body.studentPhone || !PHONE_REGEX.test(body.studentPhone.trim())) {
    return NextResponse.json({ error: "Valid phone number is required." }, { status: 400 });
  }
  if (!body.reasonCategory || !REASON_CATEGORIES.includes(body.reasonCategory as ReasonCategory)) {
    return NextResponse.json({ error: "Please choose a reason category." }, { status: 400 });
  }
  if (!body.reason || body.reason.trim().length < 20) {
    return NextResponse.json(
      { error: "Description must be at least 20 characters." },
      { status: 400 },
    );
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

  const { data: unavailable } = await supabase
    .from("unavailable_dates")
    .select("id, counselor_id, date, full_day, start_time, end_time, reason, created_at")
    .eq("counselor_id", body.counselorId);

  if (
    !isValidSlot(
      body.appointmentDate,
      body.startTime,
      (availability ?? []) as AvailabilityRow[],
      (unavailable ?? []) as UnavailableDateRow[],
    )
  ) {
    return NextResponse.json({ error: "Slot is unavailable" }, { status: 400 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("appointments")
    .insert({
      student_id: profile.id,
      counselor_id: body.counselorId,
      appointment_date: body.appointmentDate,
      start_time: body.startTime,
      reason: body.reason.trim(),
      status: "booked",
      student_phone: body.studentPhone.trim(),
      reason_category: body.reasonCategory,
      additional_notes: body.additionalNotes?.trim() || null,
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
      studentName: body.studentName?.trim() || profile.name,
      counselorEmail: counselorUser.email,
      counselorName: counselorUser.name,
      appointmentId: inserted.id,
      date: body.appointmentDate,
      startTime: body.startTime,
      reason: body.reason.trim(),
    });
  }

  return NextResponse.json({ id: inserted.id });
}

function isValidSlot(
  dateStr: string,
  startTime: string,
  avail: AvailabilityRow[],
  unavailable: UnavailableDateRow[],
): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const slots = generateSlots(avail, [], startOfWeek(date), unavailable);
  return slots.some((s) => s.date === dateStr && s.startTime === startTime);
}
