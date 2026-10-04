import { redirect } from "next/navigation";
import { loadLeague } from "@/lib/league-page";

export const dynamic = "force-dynamic";

/** Partidos del club de la liga. */
export default async function LeagueMatches({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { league } = await loadLeague(id);
  redirect(`/partidos?club=${league.clubId}`);
}
