import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMembership, settleMarket } from "@/lib/game";

/** Carga común de las páginas de liga: usuario, liga, participante y resolución del mercado. */
export async function loadLeague(idParam: string) {
  const user = await requireUser();
  const leagueId = Number(idParam);
  if (!Number.isInteger(leagueId)) notFound();
  const first = await getMembership(user.id, leagueId);
  if (!first.league) notFound();
  if (!first.member) redirect("/");
  // Primero se resuelve el mercado y después se lee la caja, para mostrar el saldo actualizado.
  await settleMarket(leagueId);
  const { league, member } = await getMembership(user.id, leagueId);
  return { user, league: league!, member: member! };
}
