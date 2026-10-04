import Link from "next/link";
import { requireAdminClub } from "@/lib/admin-club";
import { matchday } from "@/lib/matchday";
import { formatDateTime } from "@/lib/time";

export default async function AdminHome() {
  const club = await requireAdminClub();
  const { gameweek, matches } = await matchday(club.id);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">{gameweek?.name ?? "Sin jornadas"}</h2>
      <p className="text-sm text-muted">Toca un partido para llevar el marcador en directo o meter el acta.</p>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id}>
            <Link href={`/admin/partido/${m.id}`} className="card flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{m.teamShort} {m.isHome ? "vs" : "@"} {m.opponent}</span>
                <span className="text-xs text-muted">{formatDateTime(m.kickoff)}</span>
              </span>
              <span className={`chip ${m.status === "live" ? "bg-live text-white" : m.status === "finished" ? "bg-surface-2" : "bg-brand/10 text-brand-2"}`}>
                {m.status === "live" ? `VIVO ${m.goalsFor}-${m.goalsAgainst}` : m.status === "finished" ? `Final ${m.goalsFor}-${m.goalsAgainst}` : "Pendiente"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
