export type Role = "student" | "counselor";

export type AppointmentStatus = "booked" | "cancelled" | "completed";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  student_id: string | null;
  role: Role;
  created_at: string;
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
}

export interface CounselorWithUser extends CounselorRow {
  user: Pick<UserRow, "id" | "name" | "email">;
}
