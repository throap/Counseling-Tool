"use client";

import { useState } from "react";
import AvailabilityEditor from "./AvailabilityEditor";
import TimeOffEditor from "./TimeOffEditor";
import type { UnavailableDateRow } from "@/types/unavailable-dates";

interface Block {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

type Tab = "weekly" | "timeoff";

export default function AvailabilityTabs({
  counselorId,
  weeklyInitial,
  timeOffInitial,
}: {
  counselorId: string;
  weeklyInitial: Block[];
  timeOffInitial: UnavailableDateRow[];
}) {
  const [tab, setTab] = useState<Tab>("weekly");

  return (
    <div className="space-y-6">
      <div className="inline-flex gap-1 rounded-md bg-surface-muted p-1 text-sm">
        {([
          ["weekly", "Weekly schedule"],
          ["timeoff", "Time off"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 font-medium transition-all ease-smooth ${
              tab === key ? "bg-surface text-sage-dark shadow-soft" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "weekly" ? (
        <AvailabilityEditor counselorId={counselorId} initial={weeklyInitial} />
      ) : (
        <TimeOffEditor counselorId={counselorId} initial={timeOffInitial} />
      )}
    </div>
  );
}
