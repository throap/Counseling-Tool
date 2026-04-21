"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "student" | "counselor";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [tab, setTab] = useState<Tab>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.user) {
      setPending(false);
      setError(authError?.message ?? "Sign-in failed");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role, student_id")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setPending(false);
      setError("No profile found for this account. Contact your administrator.");
      return;
    }

    if (profile.role !== tab) {
      await supabase.auth.signOut();
      setPending(false);
      setError(
        `This account is registered as a ${profile.role}. Switch the tab above and try again.`,
      );
      return;
    }

    if (tab === "student") {
      const expected = studentId.trim();
      if (!expected) {
        await supabase.auth.signOut();
        setPending(false);
        setError("Student ID is required.");
        return;
      }
      if (profile.student_id !== expected) {
        await supabase.auth.signOut();
        setPending(false);
        setError("Student ID does not match our records.");
        return;
      }
    }

    const dest = next || (profile.role === "counselor" ? "/counselor/dashboard" : "/student/dashboard");
    router.push(dest);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {(["student", "counselor"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md py-2 font-medium capitalize transition ${
              tab === t ? "bg-white text-brand shadow" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {tab === "student" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Student ID</label>
          <input
            type="text"
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
