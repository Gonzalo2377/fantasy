import { asc, eq } from "drizzle-orm";
import { saveTeam } from "@/app/admin/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { db, schema } from "@/db";
import { requireAdminClub } from "@/lib/admin-club";

function TeamForm({ t }: { t?: typeof schema.clubTeams.$inferSelect }) {
  return (
    <ActionForm action={saveTeam} className="card space-y-2">
      <input type="hidden" name="id" value={t?.id ?? ""} />
      <div className="grid grid-cols-3 gap-2">
        <input className="input col-span-2" name="name" defaultValue={t?.name} placeholder="Nombre (p. ej. Femení B)" required />
        <input className="input" name="shortName" defaultValue={t?.shortName} placeholder="Abrev." required maxLength={10} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className="input" name="gender" defaultValue={t?.gender ?? "M"}><option value="M">Masculino</option><option value="F">Femenino</option></select>
        <select className="input" name="federation" defaultValue={t?.federation ?? "FCF"}><option>FCF</option><option>RFEF</option></select>
      </div>
      <input className="input" name="competition" defaultValue={t?.competition} placeholder="Competición" />
      <input className="input" name="federationUrl" defaultValue={t?.federationUrl ?? ""} placeholder="URL del calendario en la federación (opcional)" />
      <Submit className="btn btn-sm w-full">{t ? "Guardar" : "Añadir equipo"}</Submit>
    </ActionForm>
  );
}

export default async function TeamsAdmin() {
  const club = await requireAdminClub();
  const teams = await db.select().from(schema.clubTeams).where(eq(schema.clubTeams.clubId, club.id)).orderBy(asc(schema.clubTeams.sort));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Equipos de <b>{club.name}</b>. Solo equipos cuyos jugadores sean mayores de edad. Los menores se excluyen automáticamente por fecha de nacimiento.</p>
      {teams.map((t) => <TeamForm key={t.id} t={t} />)}
      <h2 className="section-title">Nuevo equipo</h2>
      <TeamForm />
    </div>
  );
}
