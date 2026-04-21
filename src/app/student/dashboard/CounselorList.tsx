"use client";

import { useMemo, useState } from "react";
import CounselorCard from "@/components/CounselorCard";

interface Item {
  id: string;
  name: string;
  department: string;
  bio: string | null;
  photoUrl: string | null;
  nextAvailable: string | null;
}

export default function CounselorList({ counselors }: { counselors: Item[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string>("all");

  const departments = useMemo(() => {
    const set = new Set(counselors.map((c) => c.department));
    return Array.from(set).sort();
  }, [counselors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return counselors.filter((c) => {
      if (department !== "all" && c.department !== department) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) || c.department.toLowerCase().includes(q)
      );
    });
  }, [counselors, query, department]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search by name or department…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No counselors match your filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CounselorCard key={c.id} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}
