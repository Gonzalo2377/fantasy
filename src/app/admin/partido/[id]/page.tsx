import { and, asc, eq, lte } from "drizzle-orm";
import { notFound } from "next/navigation";
import { saveMatch } from "@/app/admin/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { ActaEditor } from "@/components/admin/ActaEditor";
import { LiveControls } from "@/components/admin/LiveControls";
import { db, schema } from "@/db";
import { latestAllowedBirthDate } from "@/lib/age";
import { toLocalInput } from "@/lib/time";

export default async function MatchAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await db.query.matches.findFirst({ where: eq(schema.matches.id, Number(id)) });
  if (!match) notFound();
  const team = await db.query.clubTeams.findFirst({ where: eq(schema.clubTeams.id, match.clubTeamId) });
  const roster = await db
    .select({ id: schema.players.id, name: schema.players.name, position: schema.players.position })
    .from(schema.players)
    .where(and(eq(schema.players.clubTeamId, match.clubTeamId), lte(schema.players.birthDate, latestAllowedBirthDate())))
    .orderBy(asc(schema.players.shirtNumber));
  const stats = await db.select().from(schema.playerStats).where(eq(schema.playerStats.matchId, match.id));
  const club = team ? await db.query.clubs.findFirst({ where: eq(schema.clubs.id, team.clubId) }) : null;
  const gws = team ? await db.select().from(schema.gameweeks).where(eq(schema.gameweeks.clubId, team.clubId)).orderBy(asc(schema.gameweeks.number)) : [];
  const teams = team ? await db.select().from(schema.clubTeams).where(eq(schema.clubTeams.clubId, team.clubId)) : [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{team?.shortName} {match.isHome ? "vs" : "@"} {match.opponent}</h2>

      <section>
        <h3 className="section-title">Marcador en directo</h3>
        <LiveControls clubLabel={club?.shortName ?? "Club"} id={match.id} status={match.status} minute={match.minute} goalsFor={match.goalsFor} goalsAgainst={match.goalsAgainst} />
      </section>

      <section>
        <h3 className="section-title">Acta {match.statsApplied && <span className="text-good">· aplicada ✓</span>}</h3>
        <ActaEditor
          clubLabel={club?.shortName ?? "Club"}
          matchId={match.id}
          roster={roster}
          initial={stats}
          goalsFor={match.goalsFor}
          goalsAgainst={match.goalsAgainst}
          actaUrl={match.actaUrl}
        />
      </section>

      <details className="card">
        <summary className="font-semibold">Editar datos del partido</summary>
        <ActionForm action={saveMatch} className="mt-3 space-y-2">
          <input type="hidden" name="id" value={match.id} />
          <div className="grid grid-cols-2 gap-2">
            <select className="input" name="gameweekId" defaultValue={match.gameweekId}>{gws.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <select className="input" name="clubTeamId" defaultValue={match.clubTeamId}>{teams.map((t) => <option key={t.id} value={t.id}>{t.shortName}</option>)}</select>
          </div>
          <input className="input" name="opponent" defaultValue={match.opponent} />
          <input className="input" type="datetime-local" name="kickoff" defaultValue={toLocalInput(match.kickoff)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isHome" defaultChecked={match.isHome} className="h-5 w-5" /> En casa</label>
          <input className="input" name="actaUrl" defaultValue={match.actaUrl ?? ""} placeholder="URL del acta" />
          <Submit className="btn btn-sm w-full">Guardar</Submit>
        </ActionForm>
      </details>
    </div>
  );
}
