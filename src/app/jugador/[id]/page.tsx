import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { PointsPill, PosBadge, TeamTag } from "@/components/PlayerBits";
import { db, schema } from "@/db";
import { ageOn, isAdult } from "@/lib/age";
import { requireUser } from "@/lib/auth";
import { POSITION_LABEL } from "@/lib/formations";
import { money } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const row = await db
    .select({ p: schema.players, t: schema.clubTeams })
    .from(schema.players)
    .innerJoin(schema.clubTeams, eq(schema.clubTeams.id, schema.players.clubTeamId))
    .where(eq(schema.players.id, Number(id)))
    .get();
  if (!row || !isAdult(row.p.birthDate) || !row.p.active) notFound();
  const { p, t } = row;
  const stats = await db
    .select({ s: schema.playerStats, m: schema.matches })
    .from(schema.playerStats)
    .innerJoin(schema.matches, eq(schema.matches.id, schema.playerStats.matchId))
    .where(eq(schema.playerStats.playerId, p.id))
    .orderBy(desc(schema.matches.kickoff));
  const total = stats.reduce((a, r) => a + r.s.points, 0);
  const goals = stats.reduce((a, r) => a + r.s.goals, 0);
  const mins = stats.reduce((a, r) => a + r.s.minutes, 0);

  return (
    <>
      <Header title={p.name} subtitle={`${t.name} · ${POSITION_LABEL[p.position]}`} back="/" />
      <main className="px-4 pt-4">
        <div className="card flex items-center gap-3">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black pos-${p.position}`}>{p.shirtNumber ?? "–"}</div>
          <div className="flex-1 space-y-1">
            <div className="flex gap-1"><PosBadge position={p.position} /><TeamTag short={t.shortName} gender={t.gender} /></div>
            <p className="text-sm text-muted">{ageOn(p.birthDate)} años · Valor {money(p.value)}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[["Puntos", total], ["Goles", goals], ["Minutos", mins]].map(([k, v]) => (
            <div key={k} className="card py-3"><p className="text-xl font-extrabold">{v}</p><p className="text-xs text-muted">{k}</p></div>
          ))}
        </div>
        <h2 className="section-title">Partidos</h2>
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {stats.map(({ s, m }) => (
            <li key={s.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{m.isHome ? "vs" : "@"} {m.opponent} <span className="text-muted">{m.goalsFor}-{m.goalsAgainst}</span></p>
                <p className="text-xs text-muted">
                  {formatDateTime(m.kickoff)} · {s.minutes}&apos;{s.goals ? ` · ⚽×${s.goals}` : ""}{s.yellow ? " · 🟨" : ""}{s.red ? " · 🟥" : ""}
                </p>
              </div>
              <PointsPill points={s.points} />
            </li>
          ))}
          {stats.length === 0 && <li className="px-4 py-3 text-sm text-muted">Todavía no ha puntuado.</li>}
        </ul>
      </main>
    </>
  );
}
