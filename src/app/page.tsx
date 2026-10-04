import Link from "next/link";
import { eq } from "drizzle-orm";
import { createPrivate, joinByCode, joinPublic } from "@/app/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Countdown } from "@/components/Countdown";
import { Header } from "@/components/Header";
import { InstallButton } from "@/components/InstallButton";
import { LiveBoard } from "@/components/LiveBoard";
import { Logo } from "@/components/Logo";
import { db, schema } from "@/db";
import { currentUser } from "@/lib/auth";
import { openGameweek, standings } from "@/lib/game";
import { matchday } from "@/lib/matchday";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  if (!user) return <Landing />;

  const myLeagues = await db
    .select({ league: schema.leagues, member: schema.members })
    .from(schema.members)
    .innerJoin(schema.leagues, eq(schema.leagues.id, schema.members.leagueId))
    .where(eq(schema.members.userId, user.id));
  const cards = await Promise.all(
    myLeagues.map(async ({ league, member }) => {
      const { table } = await standings(league.id);
      const pos = table.findIndex((r) => r.member.id === member.id) + 1;
      const me = table[pos - 1];
      return { league, member, pos, total: me?.total ?? 0, size: table.length };
    }),
  );
  const gw = await openGameweek();
  const { gameweek, matches } = await matchday();

  return (
    <>
      <Header
        title={`Hola, ${user.name}`}
        subtitle="Fantasy CE Europa"
        right={
          <Link href="/perfil" aria-label="Perfil" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
            {user.name.slice(0, 1).toUpperCase()}
          </Link>
        }
      />
      <main className="space-y-4 px-4 pt-4">
        <InstallButton />

        {gw && (
          <div className="card flex items-center justify-between bg-gradient-to-r from-brand to-brand-2 text-white">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Cierre de alineaciones</p>
              <p className="font-bold">{gw.name}</p>
            </div>
            <p className="text-lg font-extrabold"><Countdown to={gw.deadline} /></p>
          </div>
        )}

        <section>
          <h2 className="section-title">Mis ligas</h2>
          {cards.length === 0 && <p className="card text-sm text-muted">Todavía no estás en ninguna liga. ¡Únete a una abajo!</p>}
          <ul className="space-y-2">
            {cards.map((c) => (
              <li key={c.league.id}>
                <Link href={`/liga/${c.league.id}`} className="card flex items-center gap-3 active:bg-surface-2">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-surface-2">
                    <span className="text-lg font-extrabold leading-none">{c.pos}º</span>
                    <span className="text-[10px] text-muted">de {c.size}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.league.name}</p>
                    <p className="truncate text-sm text-muted">{c.member.teamName} · {money(c.member.cash)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold tabular-nums">{c.total}</p>
                    <p className="text-[10px] text-muted">puntos</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="section-title">{gameweek ? `Partidos · ${gameweek.name}` : "Partidos"}</h2>
          <LiveBoard initial={matches} compact />
        </section>

        <section className="space-y-3">
          <h2 className="section-title">Jugar</h2>
          <details className="card group" open={cards.length === 0}>
            <summary className="cursor-pointer list-none font-semibold">🌍 Entrar en una liga pública</summary>
            <ActionForm action={joinPublic} className="mt-3 space-y-2">
              <input className="input" name="teamName" placeholder="Nombre de tu equipo" maxLength={30} />
              <Submit>Buscar liga pública</Submit>
            </ActionForm>
          </details>
          <details className="card">
            <summary className="cursor-pointer list-none font-semibold">🔒 Unirme con código</summary>
            <ActionForm action={joinByCode} className="mt-3 space-y-2">
              <input className="input uppercase tracking-widest" name="code" placeholder="CÓDIGO" required maxLength={6} autoCapitalize="characters" />
              <input className="input" name="teamName" placeholder="Nombre de tu equipo" maxLength={30} />
              <Submit>Unirme</Submit>
            </ActionForm>
          </details>
          <details className="card">
            <summary className="cursor-pointer list-none font-semibold">➕ Crear liga privada</summary>
            <ActionForm action={createPrivate} className="mt-3 space-y-2">
              <input className="input" name="name" placeholder="Nombre de la liga" required maxLength={40} />
              <input className="input" name="teamName" placeholder="Nombre de tu equipo" maxLength={30} />
              <label className="label" htmlFor="maxMembers">Máximo de participantes</label>
              <select className="input" id="maxMembers" name="maxMembers" defaultValue="8">
                {[4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <Submit>Crear liga</Submit>
            </ActionForm>
          </details>
        </section>

        <nav className="flex justify-center gap-6 py-4 text-sm font-semibold text-brand-2">
          <Link href="/reglas">Cómo se puntúa</Link>
          <Link href="/perfil">Perfil</Link>
          {user.isAdmin && <Link href="/admin">Admin</Link>}
        </nav>
      </main>
    </>
  );
}

function Landing() {
  return (
    <main className="safe-top flex min-h-dvh flex-col px-5 py-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Logo size={96} />
        <h1 className="mt-4 text-3xl font-extrabold">Fantasy Europa</h1>
        <p className="mt-2 max-w-xs text-muted">
          Ficha a jugadores y jugadoras de todos los equipos +18 del CE Europa, puja en el mercado y compite con tus amigos.
        </p>
        <ul className="mt-6 space-y-2 text-left text-sm">
          <li>⚽ Puntos reales sacados de las actas</li>
          <li>💸 Mercado de pujas que cambia cada día</li>
          <li>🔴 Marcadores en directo de la jornada</li>
          <li>🏆 Ligas públicas y privadas</li>
        </ul>
      </div>
      <div className="space-y-3">
        <InstallButton />
        <Link href="/registro" className="btn w-full">Crear cuenta</Link>
        <Link href="/login" className="btn-ghost w-full">Ya tengo cuenta</Link>
      </div>
    </main>
  );
}
