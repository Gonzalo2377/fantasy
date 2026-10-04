import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Header } from "@/components/Header";
import { ShareCode } from "@/components/ShareCode";
import { db, schema } from "@/db";
import { standings } from "@/lib/game";
import { loadLeague } from "@/lib/league-page";
import { money } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LeaguePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ j?: string }> }) {
  const { id } = await params;
  const { j } = await searchParams;
  const { league, member, club } = await loadLeague(id);
  const { table, gameweeks } = await standings(league.id);
  const selected = j ? gameweeks.find((g) => String(g.number) === j) : undefined;
  const rows = selected
    ? [...table]
        .map((r) => ({ ...r, shown: r.perGw.find((p) => p.gameweekId === selected.id)?.points ?? 0 }))
        .sort((a, b) => b.shown - a.shown)
    : table.map((r) => ({ ...r, shown: r.total }));
  const feed = await db
    .select()
    .from(schema.activity)
    .where(eq(schema.activity.leagueId, league.id))
    .orderBy(desc(schema.activity.createdAt))
    .limit(25);

  return (
    <>
      <Header
        title={league.name}
        subtitle={`${club.name} · ${league.isPublic ? "pública" : "privada"} · ${table.length}/${league.maxMembers} equipos`}
        back="/"
        right={<ShareCode code={league.code} name={league.name} />}
      />
      <main className="px-4 pt-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link href={`/liga/${league.id}`} className={`chip shrink-0 px-3 py-1.5 text-sm ${!selected ? "bg-brand text-white" : "bg-surface-2"}`}>General</Link>
          {[...gameweeks].reverse().map((g) => (
            <Link key={g.id} href={`/liga/${league.id}?j=${g.number}`} className={`chip shrink-0 px-3 py-1.5 text-sm ${selected?.id === g.id ? "bg-brand text-white" : "bg-surface-2"}`}>
              J{g.number}
            </Link>
          ))}
        </div>

        <ol className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((r, i) => (
            <li key={r.member.id} className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 ${r.member.id === member.id ? "bg-brand/5" : ""}`}>
              <span className={`w-6 text-center font-extrabold ${i === 0 ? "text-accent" : "text-muted"}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.member.teamName}{r.member.id === member.id && <span className="ml-1 text-xs text-brand-2">(tú)</span>}</p>
                <p className="text-xs text-muted">Valor {money(r.teamValue)}{!selected && gameweeks.length > 0 && ` · última jornada ${r.last} pts`}</p>
              </div>
              <span className="text-lg font-extrabold tabular-nums">{r.shown}</span>
            </li>
          ))}
        </ol>
        {gameweeks.length === 0 && <p className="mt-2 text-center text-sm text-muted">Aún no se ha jugado ninguna jornada.</p>}

        <h2 className="section-title">Actividad</h2>
        <ul className="space-y-2">
          {feed.map((a) => (
            <li key={a.id} className="card py-3 text-sm">
              <p>{a.text}</p>
              <p className="mt-0.5 text-xs text-muted">{formatDateTime(a.createdAt)}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
