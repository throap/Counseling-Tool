export interface UnavailableDateRow {
  id: string;
  counselor_id: string;
  date: string; // YYYY-MM-DD
  full_day: boolean;
  start_time: string | null; // HH:MM when full_day=false
  end_time: string | null;
  reason: string | null;
  created_at: string;
}
