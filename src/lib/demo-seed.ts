import "server-only";
/**
 * Datos de prueba: el club CE Europa con sus 4 equipos +18, jornadas, partidos y una liga privada (código EUROPA).
 * Los nombres de jugadores y rivales son FICTICIOS: sustitúyelos desde /admin/jugadores (importación CSV).
 *
 *  - loadTestClub(): lo usa el botón de /admin/clubes. No toca a los usuarios reales.
 *  - seedDemo():     lo usa `npm run db:seed` en local; además crea usuarios de ejemplo para entrar.
 */
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Position } from "@/db/schema";
import { applyActa, createLeague, joinLeague, settleMarket, type ActaLine } from "@/lib/game";
import { madridToUtc } from "@/lib/time";

const MALE = ["Marc", "Pol", "Arnau", "Jordi", "Àlex", "Pau", "Oriol", "Sergi", "Joan", "Dani", "Biel", "Èric", "Adrià", "Nil", "Hugo", "Iker", "Unai", "Raúl", "Víctor", "Gerard", "Roger", "Max"];
const FEMALE = ["Laia", "Júlia", "Marta", "Clàudia", "Aina", "Paula", "Carla", "Núria", "Anna", "Irene", "Ona", "Berta", "Martina", "Sara", "Lucía", "Noa", "Abril", "Mireia", "Emma", "Jana", "Elena", "Txell"];
const SURNAMES = ["Vidal", "Puig", "Soler", "Ferrer", "Serra", "Font", "Roca", "Vila", "Riera", "Pujol", "Mas", "Costa", "Bosch", "Sala", "Camps", "Prat", "Molina", "Romero", "Navarro", "Torres", "Ruiz", "Gil", "Marín", "Ortega", "Castro", "Rovira", "Casals", "Valls"];
const RIVALS = ["UE Muntanya", "CF Ciutat Vella", "CE Riu Blanc", "AE Pla de Mar", "CF Turó", "UD Les Fonts", "CE Vall Alta", "FC Collserola", "UE Port Nou", "CD Rambla", "CF Sant Roc", "AD Can Serra"];

const TEAMS = [
  { name: "Primer equip masculí", shortName: "Masc. A", gender: "M" as const, competition: "Primera Federación", federation: "RFEF" },
  { name: "Primer equip femení", shortName: "Fem. A", gender: "F" as const, competition: "Primera Federación", federation: "RFEF" },
  { name: "Masculí B / Amateur", shortName: "Masc. B", gender: "M" as const, competition: "Competición por confirmar", federation: "FCF" },
  { name: "Femení B", shortName: "Fem. B", gender: "F" as const, competition: "Competición por confirmar", federation: "FCF" },
];
const SHAPE: Position[] = ["POR", "POR", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "MED", "MED", "MED", "MED", "MED", "MED", "MED", "DEL", "DEL", "DEL", "DEL"];

export const TEST_CLUB_SLUG = "ce-europa";
export const TEST_LEAGUE_CODE = "EUROPA";

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

/** Crea el club de prueba con plantillas, calendario, jornada 1 puntuada y la liga EUROPA con 3 rivales. */
export async function loadTestClub(): Promise<{ created: boolean; leagueId: number }> {
  const existing = await db.query.clubs.findFirst({ where: eq(schema.clubs.slug, TEST_CLUB_SLUG) });
  if (existing) {
    const l = await db.query.leagues.findFirst({ where: eq(schema.leagues.code, TEST_LEAGUE_CODE) });
    return { created: false, leagueId: l?.id ?? 0 };
  }
  seed = 42;

  const [club] = await db
    .insert(schema.clubs)
    .values({ name: "CE Europa", shortName: "Europa", slug: TEST_CLUB_SLUG, color: "#1a4b9c", createdAt: Date.now() })
    .returning();
  const teams = await db
    .insert(schema.clubTeams)
    .values(TEAMS.map((t, i) => ({ ...t, clubId: club.id, sort: i })))
    .returning();

  // Plantillas (una sola inserción para ir rápido contra la base de datos remota).
  const used = new Set<string>();
  const playerRows = teams.flatMap((team) => {
    const rows = SHAPE.map((position, i) => {
      let name = "";
      do name = `${pick(team.gender === "F" ? FEMALE : MALE)} ${pick(SURNAMES)} ${pick(SURNAMES)}`;
      while (used.has(name));
      used.add(name);
      const year = 1991 + Math.floor(rnd() * 15); // 18-35 años
      const birthDate = `${year}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`;
      const base = team.shortName.endsWith("A") ? 1_400_000 : 700_000;
      return {
        clubTeamId: team.id, name, birthDate, position, shirtNumber: i + 1,
        value: Math.round((base + rnd() * base) / 10_000) * 10_000,
      };
    });
    // Un menor de edad para comprobar que el filtro +18 funciona: no debe aparecer nunca en el juego.
    rows.push({ clubTeamId: team.id, name: `Juvenil Prova ${team.shortName}`, birthDate: "2010-06-01", position: "MED", shirtNumber: 30, value: 500_000 });
    return rows;
  });
  await db.insert(schema.players).values(playerRows);

  // Jornadas: la 1 ya jugada, la 2 en curso (hoy, con un partido en directo), de la 3 en adelante cada semana.
  const now = new Date();
  const day = (offset: number, h: number) => {
    const d = new Date(now.getTime() + offset * 86_400_000);
    return madridToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h);
  };
  const gwRows = [
    { clubId: club.id, number: 1, name: "Jornada 1", deadline: day(-7, 10) },
    { clubId: club.id, number: 2, name: "Jornada 2", deadline: now.getTime() - 60 * 60_000 },
  ];
  for (let i = 3; i <= 12; i++) gwRows.push({ clubId: club.id, number: i, name: `Jornada ${i}`, deadline: day(7 * (i - 2) - 1, 10) });
  const gws = await db.insert(schema.gameweeks).values(gwRows).returning();

  let r = 0;
  const matchRows = gws.flatMap((gw) =>
    teams.map((team, ti) => {
      const live = gw.number === 2 && ti === 0;
      return {
        gameweekId: gw.id, clubTeamId: team.id, opponent: RIVALS[r++ % RIVALS.length], isHome: (gw.number + ti) % 2 === 0,
        kickoff: live ? now.getTime() - 50 * 60_000 : gw.deadline + ti * 2 * 60 * 60_000 + (ti >= 2 ? 86_400_000 : 0),
        status: (live ? "live" : "scheduled") as "live" | "scheduled", minute: live ? 50 : null, goalsFor: live ? 1 : 0, updatedAt: Date.now(),
      };
    }),
  );
  await db.insert(schema.matches).values(matchRows);

  // Rivales ficticios de la liga (no se puede entrar con ellos).
  const hash = await bcrypt.hash(crypto.randomUUID(), 4);
  const rivals = await db
    .insert(schema.users)
    .values(["Laia", "Pol", "Marta"].map((name) => ({
      email: `${name.toLowerCase()}.${club.id}@rivales.invalid`, name, passwordHash: hash, createdAt: Date.now(),
    })))
    .returning();

  const league = await createLeague({
    clubId: club.id, name: "Liga CE Europa", isPublic: false, ownerId: null, maxMembers: 12, code: TEST_LEAGUE_CODE,
  });
  const teamNames = ["Escapulats FC", "Les Graciencs", "Penya Fabra"];
  for (const [i, u] of rivals.entries()) {
    const m = await joinLeague(u.id, league.id, teamNames[i]);
    // Su alineación inicial cuenta desde la jornada 1 para que la clasificación tenga puntos.
    await db.update(schema.lineups).set({ gameweekId: gws[0].id }).where(eq(schema.lineups.memberId, m.id));
  }

  // Actas de la jornada 1.
  const gw1Matches = await db.select().from(schema.matches).where(eq(schema.matches.gameweekId, gws[0].id));
  const allPlayers = await db.select().from(schema.players);
  for (const match of gw1Matches) {
    const squad = allPlayers.filter((p) => p.clubTeamId === match.clubTeamId && p.birthDate < "2008-01-01");
    const gf = Math.floor(rnd() * 4);
    const ga = Math.floor(rnd() * 3);
    const xi = [squad.find((p) => p.position === "POR")!, ...squad.filter((p) => p.position === "DEF").slice(0, 4), ...squad.filter((p) => p.position === "MED").slice(0, 4), ...squad.filter((p) => p.position === "DEL").slice(0, 2)];
    const scorers = xi.filter((p) => p.position !== "POR");
    const lines: ActaLine[] = xi.map((p) => ({ playerId: p.id, minutes: rnd() < 0.2 ? 65 : 90, goals: 0, ownGoals: 0, yellow: rnd() < 0.15 ? 1 : 0, red: false, penSaved: 0, penMissed: 0 }));
    for (let g = 0; g < gf; g++) lines[xi.indexOf(pick(scorers))].goals++;
    await applyActa(match.id, gf, ga, lines);
  }

  await settleMarket(league.id);
  return { created: true, leagueId: league.id };
}

/** Solo para local: club de prueba + usuarios de ejemplo con los que entrar. */
export async function seedDemo({ reset = false }: { reset?: boolean } = {}): Promise<boolean> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.clubs);
  if (Number(n) > 0 && !reset) return false;
  if (reset) {
    for (const t of ["activity", "bids", "listings", "lineups", "ownerships", "members", "leagues", "player_stats", "matches", "gameweeks", "players", "club_teams", "clubs", "users"]) {
      await db.run(sql.raw(`delete from ${t}`));
    }
  }
  await db.insert(schema.users).values([
    { email: "admin@europa.test", name: "Admin", passwordHash: await bcrypt.hash("admin1234", 10), isAdmin: true, createdAt: Date.now() },
    { email: "jugador@europa.test", name: "Jugador", passwordHash: await bcrypt.hash("europa1234", 10), createdAt: Date.now() },
  ]);
  await loadTestClub();
  return true;
}
