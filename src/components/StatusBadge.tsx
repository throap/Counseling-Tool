import { Badge } from "./ui/Badge";
import type { AppointmentStatus } from "@/lib/types";

const TONES = {
  booked: "sage",
  cancelled: "danger",
  completed: "blue",
} as const;

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge tone={TONES[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
