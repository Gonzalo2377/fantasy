import type { Position } from "@/db/schema";

export function PosBadge({ position }: { position: Position }) {
  return <span className={`chip pos-${position} w-10 justify-center`}>{position}</span>;
}

export function TeamTag({ short, gender }: { short: string; gender: "M" | "F" }) {
  return (
    <span className={`chip ${gender === "F" ? "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200" : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"}`}>
      {short}
    </span>
  );
}

export function PointsPill({ points }: { points: number }) {
  const cls = points >= 8 ? "bg-good text-white" : points >= 3 ? "bg-brand-2 text-white" : points < 0 ? "bg-bad text-white" : "bg-surface-2 text-text";
  return <span className={`chip ${cls} min-w-8 justify-center tabular-nums`}>{points}</span>;
}
