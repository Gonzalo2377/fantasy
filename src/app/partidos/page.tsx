import Link from "next/link";
import { asc } from "drizzle-orm";
import { Header } from "@/components/Header";
import { LiveBoard } from "@/components/LiveBoard";
import { db, schema } from "@/db";
import { matchday } from "@/lib/matchday";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partidos" };

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ j?: string }> }) {
  const { j } = await searchParams;
  const gws = await db.select().from(schema.gameweeks).orderBy(asc(schema.gameweeks.number));
  const chosen = j ? gws.find((g) => String(g.number) === j) : undefined;
  const { gameweek, matches } = await matchday(chosen?.id);

  return (
    <>
      <Header title="Partidos" subtitle={gameweek ? `${gameweek.name} · todos los equipos +18` : undefined} />
      <main className="px-4 pt-4">
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {gws.map((g) => (
            <Link key={g.id} href={`/partidos?j=${g.number}`} className={`chip shrink-0 px-3 py-1.5 text-sm ${gameweek?.id === g.id ? "bg-brand text-white" : "bg-surface-2"}`}>
              J{g.number}
            </Link>
          ))}
        </div>
        <LiveBoard initial={matches} gameweekId={gameweek?.id} />
        <p className="mt-4 text-center text-xs text-muted">Los marcadores en directo se actualizan solos cada 20 segundos.</p>
      </main>
    </>
  );
}
