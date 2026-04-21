import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-brand">School Counseling</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to book or manage counseling sessions.
          </p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
