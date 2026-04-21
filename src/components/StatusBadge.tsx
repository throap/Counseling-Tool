import type { AppointmentStatus } from "@/lib/types";

const STYLES: Record<AppointmentStatus, string> = {
  booked: "bg-brand-100 text-brand-800 ring-brand-200",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
