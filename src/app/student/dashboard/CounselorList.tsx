"use client";

import { useMemo, useState } from "react";
import CounselorCard from "@/components/CounselorCard";
import { Input, Select } from "@/components/ui/Input";

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
      return c.name.toLowerCase().includes(q) || c.department.toLowerCase().includes(q);
    });
  }, [counselors, query, department]);

  return (
    <div>
      <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input
          type="search"
          placeholder="Search by name or department…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="sm:min-w-[220px]"
        >
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface p-10 text-center text-sm text-ink-muted">
          No counselors match your filters.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => <CounselorCard key={c.id} {...c} />)}
        </div>
      )}
    </div>
  );
}
