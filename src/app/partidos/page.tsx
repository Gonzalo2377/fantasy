import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { LiveBoard } from "@/components/LiveBoard";
import { db, schema } from "@/db";
import { currentUser } from "@/lib/auth";
import { clubsOfUser, getClub, listClubs } from "@/lib/clubs";
import { matchday } from "@/lib/matchday";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partidos" };

/** /partidos?club=ID[&j=número]: calendario y directo de un club. */
export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ club?: string; j?: string }> }) {
  const { club: clubParam, j } = await searchParams;
  const user = await currentUser();
  const mine = user ? await clubsOfUser(user.id) : [];
  const club = clubParam ? await getClub(Number(clubParam)) : null;

  if (!club) {
    if (mine.length) redirect(`/partidos?club=${mine[0].id}`);
    const clubs = await listClubs();
    if (clubs.length === 1) redirect(`/partidos?club=${clubs[0].id}`);
    return (
      <>
        <Header title="Partidos" subtitle="Elige un club" />
        <main className="space-y-2 px-4 pt-4">
          {clubs.map((c) => (
            <Link key={c.id} href={`/partidos?club=${c.id}`} className="card block font-semibold">{c.name}</Link>
          ))}
          {clubs.length === 0 && <p className="card text-sm text-muted">Todavía no hay clubs.</p>}
        </main>
      </>
    );
  }

  const gws = await db
    .select()
    .from(schema.gameweeks)
    .where(and(eq(schema.gameweeks.clubId, club.id)))
    .orderBy(asc(schema.gameweeks.number));
  const chosen = j ? gws.find((g) => String(g.number) === j) : undefined;
  const { gameweek, matches } = await matchday(club.id, chosen?.id);

  return (
    <>
      <Header title="Partidos" subtitle={`${club.name}${gameweek ? ` · ${gameweek.name}` : ""}`} />
      <main className="px-4 pt-4">
        {mine.length > 1 && (
          <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {mine.map((c) => (
              <Link key={c.id} href={`/partidos?club=${c.id}`} className={`chip shrink-0 px-3 py-1.5 text-sm ${c.id === club.id ? "bg-brand text-white" : "bg-surface-2"}`}>
                {c.shortName}
              </Link>
            ))}
          </div>
        )}
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {gws.map((g) => (
            <Link key={g.id} href={`/partidos?club=${club.id}&j=${g.number}`} className={`chip shrink-0 px-3 py-1.5 text-sm ${gameweek?.id === g.id ? "bg-brand text-white" : "bg-surface-2"}`}>
              J{g.number}
            </Link>
          ))}
        </div>
        <LiveBoard initial={matches} clubId={club.id} clubName={club.name} gameweekId={gameweek?.id} />
        <p className="mt-4 text-center text-xs text-muted">Los marcadores en directo se actualizan solos cada 20 segundos.</p>
      </main>
    </>
  );
}
