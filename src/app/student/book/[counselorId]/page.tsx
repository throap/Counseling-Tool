import { redirect } from "next/navigation";

// The counselor-scoped booking route is kept only as a redirect so existing
// links (CounselorCard, emails) continue to work. The real flow lives at
// /student/book and supports counselor + date + time query params.
export default function LegacyCounselorBookPage({
  params,
  searchParams,
}: {
  params: { counselorId: string };
  searchParams: { date?: string; time?: string };
}) {
  const qs = new URLSearchParams({ counselorId: params.counselorId });
  if (searchParams.date) qs.set("date", searchParams.date);
  if (searchParams.time) qs.set("time", searchParams.time);
  redirect(`/student/book?${qs.toString()}`);
}
