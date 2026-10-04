import { saveClub } from "@/app/admin/actions";
import { ActionForm, Submit } from "@/components/ActionForm";
import { listClubs, type Club } from "@/lib/clubs";

function ClubForm({ c }: { c?: Club }) {
  return (
    <ActionForm action={saveClub} className="card space-y-2">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <input className="input" name="name" defaultValue={c?.name} placeholder="Nombre (p. ej. CE Europa)" required />
      <div className="grid grid-cols-3 gap-2">
        <input className="input col-span-2" name="shortName" defaultValue={c?.shortName} placeholder="Nombre corto" maxLength={16} />
        <input className="input h-11 p-1" type="color" name="color" defaultValue={c?.color ?? "#0b3f91"} aria-label="Color" />
      </div>
      <Submit className="btn btn-sm w-full">{c ? "Guardar" : "Crear club"}</Submit>
    </ActionForm>
  );
}

export default async function ClubsAdmin() {
  const clubs = await listClubs();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Cada liga pertenece a un club: la plantilla inicial, el mercado y el calendario salen solo de los equipos de ese club.
        Elige arriba qué club administras.
      </p>
      {clubs.map((c) => <ClubForm key={c.id} c={c} />)}
      <h2 className="section-title">Nuevo club</h2>
      <ClubForm />
    </div>
  );
}
