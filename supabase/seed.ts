/**
 * Seed sample counselors, availability, and student accounts.
 *
 * Prereqs:
 *   - Run supabase/schema.sql against your project first.
 *   - Populate .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run:
 *   npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedCounselor {
  email: string;
  password: string;
  name: string;
  department: string;
  bio: string;
}

interface SeedStudent {
  email: string;
  password: string;
  name: string;
  studentId: string;
}

const counselors: SeedCounselor[] = [
  {
    email: "alex.rivera@school.test",
    password: "Password123!",
    name: "Alex Rivera",
    department: "Academic Advising",
    bio: "Helps students plan coursework, track graduation requirements, and navigate academic challenges.",
  },
  {
    email: "jordan.kim@school.test",
    password: "Password123!",
    name: "Jordan Kim",
    department: "College Prep",
    bio: "Guides juniors and seniors through college applications, essays, and financial aid.",
  },
  {
    email: "sam.patel@school.test",
    password: "Password123!",
    name: "Sam Patel",
    department: "Personal Wellness",
    bio: "Provides a confidential space to talk through stress, relationships, and mental health.",
  },
];

const students: SeedStudent[] = [
  {
    email: "taylor.morgan@school.test",
    password: "Password123!",
    name: "Taylor Morgan",
    studentId: "S100001",
  },
  {
    email: "casey.nguyen@school.test",
    password: "Password123!",
    name: "Casey Nguyen",
    studentId: "S100002",
  },
];

async function upsertAuthUser(email: string, password: string): Promise<string> {
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  return data.user.id;
}

async function upsertUserRow(row: {
  id: string;
  name: string;
  email: string;
  role: "student" | "counselor";
  studentId?: string;
}) {
  const { error } = await admin.from("users").upsert(
    {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      student_id: row.studentId ?? null,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function upsertCounselorRow(userId: string, department: string, bio: string): Promise<string> {
  const { data: existing } = await admin
    .from("counselors")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await admin.from("counselors").update({ department, bio }).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await admin
    .from("counselors")
    .insert({ user_id: userId, department, bio })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("insert counselor failed");
  return data.id;
}

async function setCounselorWeekdayAvailability(counselorId: string) {
  await admin.from("availability").delete().eq("counselor_id", counselorId);
  const rows = [1, 2, 3, 4, 5].map((dow) => ({
    counselor_id: counselorId,
    day_of_week: dow,
    start_time: "09:00",
    end_time: "15:00",
    slot_duration_minutes: 30,
  }));
  const { error } = await admin.from("availability").insert(rows);
  if (error) throw error;
}

async function run() {
  console.log("Seeding counselors…");
  for (const c of counselors) {
    const id = await upsertAuthUser(c.email, c.password);
    await upsertUserRow({ id, name: c.name, email: c.email, role: "counselor" });
    const counselorId = await upsertCounselorRow(id, c.department, c.bio);
    await setCounselorWeekdayAvailability(counselorId);
    console.log(`  ✓ ${c.name} (${c.email})`);
  }

  console.log("Seeding students…");
  for (const s of students) {
    const id = await upsertAuthUser(s.email, s.password);
    await upsertUserRow({
      id,
      name: s.name,
      email: s.email,
      role: "student",
      studentId: s.studentId,
    });
    console.log(`  ✓ ${s.name} (${s.email} / student ID ${s.studentId})`);
  }

  console.log("\nDone. Login with any of the seeded accounts — password for all: Password123!");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^"(.*)"$/, "$1")
        .replace(/^'(.*)'$/, "$1");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env.local not present — relying on real env.
  }
}
