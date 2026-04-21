import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import BookingView from "./BookingView";

export const dynamic = "force-dynamic";

export default async function BookPage({ params }: { params: { counselorId: string } }) {
  await requireRole("student");
  const supabase = createClient();

  const { data: counselor } = await supabase
    .from("counselors")
    .select("id, bio, department, photo_url, user:users!counselors_user_id_fkey(id, name)")
    .eq("id", params.counselorId)
    .single();

  if (!counselor) notFound();

  const { data: availability } = await supabase
    .from("availability")
    .select("id, counselor_id, day_of_week, start_time, end_time, slot_duration_minutes")
    .eq("counselor_id", params.counselorId);

  const { data: booked } = await supabase
    .from("appointments")
    .select("appointment_date, start_time, status")
    .eq("counselor_id", params.counselorId)
    .eq("status", "booked")
    .gte("appointment_date", new Date().toISOString().slice(0, 10));

  const user = Array.isArray(counselor.user) ? counselor.user[0] : counselor.user;

  return (
    <>
      <Nav role="student" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <p className="text-sm text-brand-700">{counselor.department}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{user?.name}</h1>
          {counselor.bio && <p className="mt-1 text-slate-600">{counselor.bio}</p>}
        </header>

        <BookingView
          counselorId={counselor.id}
          availability={availability ?? []}
          booked={booked ?? []}
        />
      </main>
    </>
  );
}
