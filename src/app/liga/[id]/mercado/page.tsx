import { and, desc, eq, inArray } from "drizzle-orm";
import { BidBox } from "@/components/BidBox";
import { Countdown } from "@/components/Countdown";
import { Header } from "@/components/Header";
import { PointsPill, PosBadge, TeamTag } from "@/components/PlayerBits";
import { db, schema } from "@/db";
import { playerPointsSummary } from "@/lib/game";
import { loadLeague } from "@/lib/league-page";
import { money } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league, member } = await loadLeague(id);
  const { listings, players, clubTeams, members, bids } = schema;

  const open = await db
    .select({ l: listings, p: players, t: clubTeams, seller: members.teamName })
    .from(listings)
    .innerJoin(players, eq(players.id, listings.playerId))
    .innerJoin(clubTeams, eq(clubTeams.id, players.clubTeamId))
    .leftJoin(members, eq(members.id, listings.sellerMemberId))
    .where(and(eq(listings.leagueId, league.id), eq(listings.status, "open")))
    .orderBy(desc(listings.minPrice));
  const ids = open.map((o) => o.l.id);
  const allBids = ids.length ? await db.select().from(bids).where(inArray(bids.listingId, ids)) : [];
  const mine = new Map(allBids.filter((b) => b.memberId === member.id).map((b) => [b.listingId, b.amount]));
  const count = new Map<number, number>();
  for (const b of allBids) count.set(b.listingId, (count.get(b.listingId) ?? 0) + 1);
  const committed = [...mine.values()].reduce((a, b) => a + b, 0);
  const summary = await playerPointsSummary();
  const closesAt = open[0]?.l.closesAt;

  const recent = await db
    .select({ l: listings, p: players, buyer: members.teamName })
    .from(listings)
    .innerJoin(players, eq(players.id, listings.playerId))
    .leftJoin(members, eq(members.id, listings.winnerMemberId))
    .where(and(eq(listings.leagueId, league.id), eq(listings.status, "sold")))
    .orderBy(desc(listings.closesAt), desc(listings.id))
    .limit(10);

  return (
    <>
      <Header title="Mercado" subtitle={league.name} back={`/liga/${league.id}`} />
      <main className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="card py-3">
            <p className="text-xs text-muted">Tu caja</p>
            <p className="text-lg font-extrabold">{money(member.cash)}</p>
            {committed > 0 && <p className="text-xs text-muted">Pujado: {money(committed)}</p>}
          </div>
          <div className="card py-3">
            <p className="text-xs text-muted">Cierre del mercado</p>
            <p className="text-lg font-extrabold">{closesAt ? <Countdown to={closesAt} /> : "—"}</p>
            <p className="text-xs text-muted">Cada día a las 8:00</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Las pujas son secretas. Al cierre gana la más alta; si no te llega el dinero, pasa a la siguiente.</p>

        <ul className="mt-3 space-y-3">
          {open.map(({ l, p, t, seller }) => {
            const s = summary.get(p.id);
            return (
              <li key={l.id} className={`card ${mine.has(l.id) ? "border-brand-2" : ""}`}>
                <div className="flex items-center gap-3">
                  <PosBadge position={p.position} />
                  <div className="min-w-0 flex-1">
                    <a href={`/jugador/${p.id}`} className="block truncate font-semibold">{p.name}</a>
                    <p className="flex flex-wrap items-center gap-1 text-xs text-muted">
                      <TeamTag short={t.shortName} gender={t.gender} />
                      {seller ? `de ${seller}` : "libre"} · {count.get(l.id) ?? 0} pujas
                    </p>
                  </div>
                  <div className="text-right">
                    <PointsPill points={s?.total ?? 0} />
                    <p className="mt-1 text-xs font-semibold tabular-nums">{money(l.minPrice)}</p>
                  </div>
                </div>
                <BidBox leagueId={league.id} listingId={l.id} minPrice={l.minPrice} myBid={mine.get(l.id) ?? null} mine={l.sellerMemberId === member.id} />
              </li>
            );
          })}
          {open.length === 0 && <li className="card text-sm text-muted">No quedan jugadores libres en el mercado.</li>}
        </ul>

        {recent.length > 0 && (
          <>
            <h2 className="section-title">Últimos fichajes</h2>
            <ul className="overflow-hidden rounded-2xl border border-border bg-surface text-sm">
              {recent.map(({ l, p, buyer }) => (
                <li key={l.id} className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 last:border-0">
                  <span className="min-w-0 truncate"><b>{buyer}</b> · {p.name}</span>
                  <span className="shrink-0 text-right text-xs text-muted">{money(l.finalPrice ?? 0)}<br />{formatDateTime(l.closesAt)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
