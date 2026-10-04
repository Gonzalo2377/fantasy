// Comprueba que cada liga solo usa los jugadores, jornadas y partidos de su club.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), "fc-test-")), "t.db")}`;

const { db, schema } = await import("@/db");
const { ensureDb } = await import("@/db/bootstrap");
const game = await import("@/lib/game");
const { matchday } = await import("@/lib/matchday");
const { eq, inArray } = await import("drizzle-orm");

const SHAPE = ["POR", "POR", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "MED", "MED", "MED", "MED", "MED", "MED", "DEL", "DEL", "DEL", "DEL"] as const;

async function makeClub(name: string) {
  const [club] = await db.insert(schema.clubs).values({ name, shortName: name, slug: name.toLowerCase(), createdAt: Date.now() }).returning();
  const [team] = await db
    .insert(schema.clubTeams)
    .values({ clubId: club.id, name: `${name} A`, shortName: `${name} A`, gender: "M", competition: "Liga" })
    .returning();
  await db.insert(schema.players).values(
    SHAPE.map((position, i) => ({ clubTeamId: team.id, name: `${name} ${i}`, birthDate: "1995-01-01", position })),
  );
  const [gw] = await db
    .insert(schema.gameweeks)
    .values({ clubId: club.id, number: 1, name: "Jornada 1", deadline: Date.now() + 86_400_000 })
    .returning();
  await db.insert(schema.matches).values({ gameweekId: gw.id, clubTeamId: team.id, opponent: `Rival de ${name}`, kickoff: gw.deadline + 3_600_000 });
  return { club, team };
}

async function clubOfPlayers(ids: number[]) {
  const rows = await db
    .select({ clubId: schema.clubTeams.clubId })
    .from(schema.players)
    .innerJoin(schema.clubTeams, eq(schema.clubTeams.id, schema.players.clubTeamId))
    .where(inArray(schema.players.id, ids));
  return new Set(rows.map((r) => r.clubId));
}

let europa: Awaited<ReturnType<typeof makeClub>>;
let other: Awaited<ReturnType<typeof makeClub>>;
let userId: number;

beforeAll(async () => {
  await ensureDb();
  europa = await makeClub("Europa");
  other = await makeClub("Otro");
  [{ id: userId }] = await db
    .insert(schema.users)
    .values({ email: "t@t.test", name: "T", passwordHash: "x", createdAt: Date.now() })
    .returning();
});

describe("ligas por club", () => {
  it("la plantilla inicial y el mercado salen solo del club de la liga", async () => {
    const league = await game.createLeague({ clubId: europa.club.id, name: "Liga Europa", isPublic: false, ownerId: userId, code: "EUROPA" });
    expect(league.code).toBe("EUROPA");
    const member = await game.joinLeague(userId, league.id, "Mi equipo");
    const squad = await game.squadOf(member.id);
    expect(squad).toHaveLength(11);
    expect(await clubOfPlayers(squad.map((p) => p.id))).toEqual(new Set([europa.club.id]));

    await game.settleMarket(league.id);
    const market = await db.select().from(schema.listings).where(eq(schema.listings.leagueId, league.id));
    expect(market.length).toBeGreaterThan(0);
    expect(await clubOfPlayers(market.map((l) => l.playerId))).toEqual(new Set([europa.club.id]));
  });

  it("la alineación usa la jornada del club de la liga", async () => {
    const league = await game.createLeague({ clubId: other.club.id, name: "Liga Otro", isPublic: false, ownerId: userId });
    const member = await game.joinLeague(userId, league.id, "Otro equipo");
    const res = await game.ensureOpenLineup(member.id);
    expect(res?.gw.clubId).toBe(other.club.id);
  });

  it("los partidos de la jornada son solo los del club", async () => {
    const { matches } = await matchday(europa.club.id);
    expect(matches.map((m) => m.opponent)).toEqual(["Rival de Europa"]);
  });

  it("las ligas públicas se separan por club", async () => {
    const a = await game.joinPublicLeague(userId, europa.club.id, "Público A");
    const b = await game.joinPublicLeague(userId, other.club.id, "Público B");
    const la = await db.query.leagues.findFirst({ where: eq(schema.leagues.id, a.leagueId) });
    const lb = await db.query.leagues.findFirst({ where: eq(schema.leagues.id, b.leagueId) });
    expect(la?.clubId).toBe(europa.club.id);
    expect(lb?.clubId).toBe(other.club.id);
  });
});
