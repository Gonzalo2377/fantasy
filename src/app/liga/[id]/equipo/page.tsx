import { and, eq } from "drizzle-orm";
import { Countdown } from "@/components/Countdown";
import { Header } from "@/components/Header";
import { LineupEditor } from "@/components/LineupEditor";
import { db, schema } from "@/db";
import { ensureOpenLineup, playerPointsSummary, squadOf } from "@/lib/game";
import { loadLeague } from "@/lib/league-page";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, member } = await loadLeague(id);
  const [squad, summary, open, myListings] = await Promise.all([
    squadOf(member.id),
    playerPointsSummary(),
    ensureOpenLineup(member.id),
    db
      .select({ playerId: schema.listings.playerId })
      .from(schema.listings)
      .where(and(eq(schema.listings.sellerMemberId, member.id), eq(schema.listings.status, "open"))),
  ]);
  const listed = new Set(myListings.map((l) => l.playerId));
  const data = squad.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    value: p.value,
    teamShort: p.teamShort,
    gender: p.gender,
    total: summary.get(p.id)?.total ?? 0,
    last: summary.get(p.id)?.last ?? [],
    listed: listed.has(p.id),
  }));
  const lineup = open?.lineup;

  return (
    <>
      <Header title={member.teamName} subtitle={`${league.name} · Caja ${money(member.cash)}`} back={`/liga/${league.id}`} />
      <main className="px-4 pt-4">
        {open ? (
          <p className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <b>{open.gw.name}</b> · cierra en <b><Countdown to={open.gw.deadline} /></b>
          </p>
        ) : (
          <p className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">No hay jornada abierta: la alineación está bloqueada.</p>
        )}
        <LineupEditor
          key={lineup?.id ?? 0}
          leagueId={league.id}
          squad={data}
          initialFormation={lineup?.formation ?? "4-4-2"}
          initialIds={lineup ? (JSON.parse(lineup.playerIds) as number[]) : []}
          initialCaptain={lineup?.captainId ?? null}
          locked={!open}
        />
      </main>
    </>
  );
}
