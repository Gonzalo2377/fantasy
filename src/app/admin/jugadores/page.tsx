import { asc, eq, inArray } from "drizzle-orm";
import { importPlayersCsv, savePlayer } from "@/app/admin/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { db, schema } from "@/db";
import { requireAdminClub } from "@/lib/admin-club";
import { ageOn, isAdult } from "@/lib/age";

type Team = typeof schema.clubTeams.$inferSelect;
type Player = typeof schema.players.$inferSelect;

function PlayerForm({ p, teams, teamId }: { p?: Player; teams: Team[]; teamId?: number }) {
  return (
    <ActionForm action={savePlayer} className="space-y-2">
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <input className="input" name="name" defaultValue={p?.name} placeholder="Nombre y apellidos" required />
      <input className="input" name="actaName" defaultValue={p?.actaName ?? ""} placeholder="Nombre en el acta (APELLIDOS, NOMBRE)" />
      <div className="grid grid-cols-2 gap-2">
        <input className="input" type="date" name="birthDate" defaultValue={p?.birthDate} required aria-label="Fecha de nacimiento" />
        <select className="input" name="position" defaultValue={p?.position ?? "MED"}>{["POR", "DEF", "MED", "DEL"].map((x) => <option key={x}>{x}</option>)}</select>
        <select className="input" name="clubTeamId" defaultValue={p?.clubTeamId ?? teamId}>{teams.map((t) => <option key={t.id} value={t.id}>{t.shortName}</option>)}</select>
        <input className="input" name="shirtNumber" inputMode="numeric" defaultValue={p?.shirtNumber ?? ""} placeholder="Dorsal" />
        <input className="input" name="value" inputMode="numeric" defaultValue={p?.value ?? 1_000_000} aria-label="Valor" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="h-5 w-5" /> Activo</label>
      </div>
      <Submit className="btn btn-sm w-full">{p ? "Guardar" : "Añadir"}</Submit>
    </ActionForm>
  );
}

export default async function PlayersAdmin() {
  const club = await requireAdminClub();
  const teams = await db.select().from(schema.clubTeams).where(eq(schema.clubTeams.clubId, club.id)).orderBy(asc(schema.clubTeams.sort));
  const players = teams.length
    ? await db.select().from(schema.players).where(inArray(schema.players.clubTeamId, teams.map((t) => t.id))).orderBy(asc(schema.players.position), asc(schema.players.name))
    : [];
  return (
    <div className="space-y-4">
      <details className="card">
        <summary className="font-semibold">Importar plantilla (CSV)</summary>
        <p className="my-2 text-xs text-muted">
          Una línea por jugador: <code>nombre;AAAA-MM-DD;POR|DEF|MED|DEL;abreviatura_equipo;dorsal;valor;nombre_en_acta</code>. Equipos:{" "}
          {teams.map((t) => t.shortName).join(", ")}.
        </p>
        <ActionForm action={importPlayersCsv} resetOnOk>
          <textarea className="input min-h-40 py-2 font-mono text-xs" name="csv" placeholder={"Laia Puig Vidal;2001-04-12;MED;Fem. A;8;1500000;PUIG VIDAL, LAIA"} />
          <Submit className="btn btn-sm mt-2 w-full">Importar</Submit>
        </ActionForm>
      </details>

      {teams.map((t) => {
        const list = players.filter((p) => p.clubTeamId === t.id);
        return (
          <section key={t.id}>
            <h2 className="section-title">{t.name} ({list.length})</h2>
            <ul className="space-y-2">
              {list.map((p) => (
                <li key={p.id}>
                  <details className="card py-3">
                    <summary className="flex cursor-pointer items-center gap-2 text-sm">
                      <span className={`chip pos-${p.position}`}>{p.position}</span>
                      <span className={`flex-1 truncate ${p.active ? "" : "line-through opacity-50"}`}>{p.name}</span>
                      {isAdult(p.birthDate) ? <span className="text-xs text-muted">{ageOn(p.birthDate)} años</span> : <span className="chip bg-bad text-white">Menor · excluido</span>}
                    </summary>
                    <div className="mt-3"><PlayerForm p={p} teams={teams} /></div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section>
        <h2 className="section-title">Nuevo jugador</h2>
        <div className="card"><PlayerForm teams={teams} teamId={teams[0]?.id} /></div>
      </section>
    </div>
  );
}
