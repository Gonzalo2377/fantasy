"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MatchView } from "@/lib/matchday";
import { TeamTag } from "@/components/PlayerBits";

const fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function LiveBoard({ initial, gameweekId, compact }: { initial: MatchView[]; gameweekId?: number; compact?: boolean }) {
  const [matches, setMatches] = useState(initial);
  const anyLive = matches.some((m) => m.status === "live");
  const soon = matches.some((m) => m.status === "scheduled" && m.kickoff - Date.now() < 30 * 60_000);

  useEffect(() => setMatches(initial), [initial]);
  useEffect(() => {
    if (!anyLive && !soon) return;
    const t = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/partidos${gameweekId ? `?jornada=${gameweekId}` : ""}`, { cache: "no-store" });
        if (r.ok) setMatches((await r.json()).matches);
      } catch {}
    }, 20_000);
    return () => clearInterval(t);
  }, [anyLive, soon, gameweekId]);

  if (!matches.length) return <p className="card text-sm text-muted">No hay partidos programados en esta jornada.</p>;

  const list = compact ? [...matches].sort((a, b) => rank(a) - rank(b)).slice(0, 3) : matches;
  return (
    <ul className="space-y-2">
      {list.map((m) => {
        const home = m.isHome ? "CE Europa" : m.opponent;
        const away = m.isHome ? m.opponent : "CE Europa";
        const hg = m.isHome ? m.goalsFor : m.goalsAgainst;
        const ag = m.isHome ? m.goalsAgainst : m.goalsFor;
        return (
          <li key={m.id} className={`card flex items-center gap-3 py-3 ${m.status === "live" ? "border-live/60" : ""}`}>
            <div className="w-16 shrink-0 text-center text-xs">
              {m.status === "live" ? (
                <span className="inline-flex items-center gap-1 font-bold text-live">
                  <span className="live-dot h-2 w-2 rounded-full bg-live" />
                  {m.minute != null ? `${m.minute}'` : "VIVO"}
                </span>
              ) : m.status === "finished" ? (
                <span className="font-semibold text-muted">Final</span>
              ) : (
                <span className="text-muted">{fmt.format(m.kickoff)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1"><TeamTag short={m.teamShort} gender={m.gender} /></div>
              <div className={`truncate text-sm ${m.isHome ? "font-bold" : ""}`}>{home}</div>
              <div className={`truncate text-sm ${!m.isHome ? "font-bold" : ""}`}>{away}</div>
            </div>
            <div className="w-8 text-right text-lg font-extrabold tabular-nums leading-tight">
              {m.status === "scheduled" ? <span className="text-muted">–</span> : <>{hg}<br />{ag}</>}
            </div>
          </li>
        );
      })}
      {compact && matches.length > 3 && (
        <li><Link href="/partidos" className="block py-1 text-center text-sm font-semibold text-brand-2">Ver todos los partidos ({matches.length})</Link></li>
      )}
    </ul>
  );
}

function rank(m: MatchView) {
  return m.status === "live" ? 0 : m.status === "scheduled" ? 1 : 2;
}
