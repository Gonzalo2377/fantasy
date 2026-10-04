import Link from "next/link";
import { asc } from "drizzle-orm";
import { saveGameweek, saveMatch } from "@/app/admin/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { db, schema } from "@/db";
import { formatDateTime, toLocalInput } from "@/lib/time";

export default async function GameweeksAdmin() {
  const gws = await db.select().from(schema.gameweeks).orderBy(asc(schema.gameweeks.number));
  const teams = await db.select().from(schema.clubTeams).orderBy(asc(schema.clubTeams.sort));
  const matches = await db.select().from(schema.matches).orderBy(asc(schema.matches.kickoff));
  const teamName = new Map(teams.map((t) => [t.id, t.shortName]));
  const nextNumber = (gws.at(-1)?.number ?? 0) + 1;

  return (
    <div className="space-y-4">
      <details className="card">
        <summary className="font-semibold">➕ Nueva jornada</summary>
        <ActionForm action={saveGameweek} className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <input className="input" name="number" inputMode="numeric" defaultValue={nextNumber} aria-label="Número" />
            <input className="input col-span-2" name="name" defaultValue={`Jornada ${nextNumber}`} />
          </div>
          <label className="label">Cierre de alineaciones (hora de Madrid)</label>
          <input className="input" type="datetime-local" name="deadline" required />
          <Submit className="btn btn-sm w-full">Crear jornada</Submit>
        </ActionForm>
      </details>
      <details className="card">
        <summary className="font-semibold">➕ Nuevo partido</summary>
        <ActionForm action={saveMatch} className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select className="input" name="gameweekId">{gws.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <select className="input" name="clubTeamId">{teams.map((t) => <option key={t.id} value={t.id}>{t.shortName}</option>)}</select>
          </div>
          <input className="input" name="opponent" placeholder="Rival" required />
          <input className="input" type="datetime-local" name="kickoff" required aria-label="Hora de inicio" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isHome" defaultChecked className="h-5 w-5" /> El Europa juega en casa</label>
          <input className="input" name="actaUrl" placeholder="URL del acta en la federación (opcional)" />
          <Submit className="btn btn-sm w-full">Crear partido</Submit>
        </ActionForm>
      </details>

      {gws.map((g) => (
        <section key={g.id}>
          <details>
            <summary className="section-title cursor-pointer">{g.name} · cierre {formatDateTime(g.deadline)}</summary>
            <ActionForm action={saveGameweek} className="card mb-2 space-y-2">
              <input type="hidden" name="id" value={g.id} />
              <input type="hidden" name="number" value={g.number} />
              <input className="input" name="name" defaultValue={g.name} />
              <input className="input" type="datetime-local" name="deadline" defaultValue={toLocalInput(g.deadline)} />
              <Submit className="btn-ghost btn-sm w-full">Guardar jornada</Submit>
            </ActionForm>
          </details>
          <ul className="space-y-1">
            {matches.filter((m) => m.gameweekId === g.id).map((m) => (
              <li key={m.id}>
                <Link href={`/admin/partido/${m.id}`} className="card flex justify-between py-2.5 text-sm">
                  <span>{teamName.get(m.clubTeamId)} {m.isHome ? "vs" : "@"} {m.opponent}</span>
                  <span className="text-muted">{m.status === "scheduled" ? formatDateTime(m.kickoff) : `${m.goalsFor}-${m.goalsAgainst}`}{m.statsApplied ? " ✓" : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
