import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentGameweek } from "@/lib/game";

export type MatchView = {
  id: number;
  team: string;
  teamShort: string;
  gender: "M" | "F";
  opponent: string;
  isHome: boolean;
  kickoff: number;
  status: "scheduled" | "live" | "finished";
  goalsFor: number;
  goalsAgainst: number;
  minute: number | null;
};

export async function matchday(gameweekId?: number) {
  const gw = gameweekId
    ? await db.query.gameweeks.findFirst({ where: eq(schema.gameweeks.id, gameweekId) })
    : await currentGameweek();
  if (!gw) return { gameweek: null, matches: [] as MatchView[] };
  const rows = await db
    .select({ m: schema.matches, t: schema.clubTeams })
    .from(schema.matches)
    .innerJoin(schema.clubTeams, eq(schema.clubTeams.id, schema.matches.clubTeamId))
    .where(eq(schema.matches.gameweekId, gw.id))
    .orderBy(asc(schema.matches.kickoff));
  const matches: MatchView[] = rows.map(({ m, t }) => ({
    id: m.id,
    team: t.name,
    teamShort: t.shortName,
    gender: t.gender,
    opponent: m.opponent,
    isHome: m.isHome,
    kickoff: m.kickoff,
    status: m.status,
    goalsFor: m.goalsFor,
    goalsAgainst: m.goalsAgainst,
    minute: m.minute,
  }));
  return { gameweek: gw, matches };
}
