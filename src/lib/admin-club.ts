import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getClub, listClubs } from "@/lib/clubs";

export const ADMIN_CLUB_COOKIE = "fe_admin_club";

/** Club que se está administrando (elegido en la cabecera del panel). */
export async function adminClub() {
  const id = Number((await cookies()).get(ADMIN_CLUB_COOKIE)?.value);
  const club = id ? await getClub(id) : null;
  return club ?? (await listClubs())[0] ?? null;
}

/** Igual que adminClub, pero si no hay ningún club manda a crearlo. */
export async function requireAdminClub() {
  const club = await adminClub();
  if (!club) redirect("/admin/clubes");
  return club;
}
