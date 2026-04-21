export interface InviteCodeRow {
  id: string;
  code: string;
  created_by: string | null;
  used_by: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
}
