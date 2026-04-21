import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import InviteCodeManager from "./InviteCodeManager";

export const dynamic = "force-dynamic";

interface CodeRow {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  used_by: string | null;
  used_at: string | null;
  used_user: { email: string } | { email: string }[] | null;
}

export default async function InviteCodesPage() {
  await requireAdmin();
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("invite_codes")
    .select(
      "id, code, created_at, expires_at, used_by, used_at, used_user:users!invite_codes_used_by_fkey(email)",
    )
    .order("created_at", { ascending: false });

  const codes = ((rows ?? []) as CodeRow[]).map((r) => {
    const u = Array.isArray(r.used_user) ? r.used_user[0] : r.used_user;
    return {
      id: r.id,
      code: r.code,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      usedBy: r.used_by,
      usedEmail: u?.email ?? null,
    };
  });

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-8">
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-ink">Counselor invite codes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Generate new codes and review who has redeemed them. Codes are a permanent audit trail —
          they can&rsquo;t be deleted.
        </p>
      </header>
      <InviteCodeManager codes={codes} />
    </main>
  );
}
