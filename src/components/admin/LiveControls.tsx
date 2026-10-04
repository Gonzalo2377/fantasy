"use client";
import { useTransition } from "react";
import { updateLive } from "@/app/admin/actions";
import type { MatchStatus } from "@/db/schema";

export function LiveControls({ clubLabel, id, status, minute, goalsFor, goalsAgainst }: { clubLabel: string; id: number; status: MatchStatus; minute: number | null; goalsFor: number; goalsAgainst: number }) {
  const [pending, start] = useTransition();
  const run = (p: Parameters<typeof updateLive>[1]) => start(() => updateLive(id, p));
  return (
    <div className={`card space-y-3 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-around text-center">
        <Score label={clubLabel} value={goalsFor} onChange={(v) => run({ goalsFor: v })} />
        <span className="text-2xl font-bold text-muted">–</span>
        <Score label="Rival" value={goalsAgainst} onChange={(v) => run({ goalsAgainst: v })} />
      </div>
      <div className="flex items-center justify-center gap-2">
        <button className="btn-ghost btn-sm" onClick={() => run({ minute: Math.max(1, (minute ?? 0) - 5) })}>−5&apos;</button>
        <span className="w-16 text-center text-xl font-bold tabular-nums">{minute ?? "–"}&apos;</span>
        <button className="btn-ghost btn-sm" onClick={() => run({ minute: (minute ?? 0) + 5 })}>+5&apos;</button>
        <button className="btn-ghost btn-sm" onClick={() => run({ minute: 45 })}>Desc.</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["scheduled", "live", "finished"] as MatchStatus[]).map((s) => (
          <button key={s} className={`btn-sm ${status === s ? "btn" : "btn-ghost"}`} onClick={() => run({ status: s, ...(s === "finished" ? { minute: null } : {}) })}>
            {s === "scheduled" ? "Pendiente" : s === "live" ? "En directo" : "Final"}
          </button>
        ))}
      </div>
    </div>
  );
}

function Score({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <button className="btn-ghost btn-sm w-10" onClick={() => onChange(value - 1)} aria-label={`Quitar gol ${label}`}>−</button>
        <span className="w-8 text-4xl font-extrabold tabular-nums">{value}</span>
        <button className="btn btn-sm w-10" onClick={() => onChange(value + 1)} aria-label={`Gol ${label}`}>+</button>
      </div>
    </div>
  );
}
