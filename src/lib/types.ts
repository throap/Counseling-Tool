export type Role = "student" | "counselor";

export type AppointmentStatus = "booked" | "cancelled" | "completed";

export type CancelledBy = "student" | "counselor";

export type ReasonCategory =
  | "Academic"
  | "College Prep"
  | "Personal"
  | "Career"
  | "Other";

export const REASON_CATEGORIES: ReasonCategory[] = [
  "Academic",
  "College Prep",
  "Personal",
  "Career",
  "Other",
];

export interface UserRow {
  id: string;
  name: string;
  email: string;
  student_id: string | null;
  role: Role;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  school_name: string | null;
  svcte_course: string | null;
}

export interface CounselorRow {
  id: string;
  user_id: string;
  bio: string | null;
  department: string;
  photo_url: string | null;
}

export interface AvailabilityRow {
  id: string;
  counselor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

export interface AppointmentRow {
  id: string;
  student_id: string;
  counselor_id: string;
  appointment_date: string;
  start_time: string;
  status: AppointmentStatus;
  reason: string | null;
  created_at: string;
  student_phone: string | null;
  reason_category: ReasonCategory | null;
  additional_notes: string | null;
  cancelled_by: CancelledBy | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  is_pinned: boolean;
}

export interface CounselorWithUser extends CounselorRow {
  user: Pick<UserRow, "id" | "name" | "email">;
}
