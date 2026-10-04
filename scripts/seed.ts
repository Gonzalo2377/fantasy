/**
 * Datos de ejemplo para probar la app.
 * Los nombres de jugadores son FICTICIOS: sustitúyelos desde /admin/jugadores (importación CSV).
 *
 *   npm run db:seed            -> crea datos si la BD está vacía
 *   npm run db:seed -- --reset -> borra todo y vuelve a crear
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import type { Position } from "../src/db/schema";
import { applyActa, createLeague, joinLeague, settleMarket, type ActaLine } from "../src/lib/game";
import { madridToUtc } from "../src/lib/time";

const reset = process.argv.includes("--reset");

const MALE = ["Marc", "Pol", "Arnau", "Jordi", "Àlex", "Pau", "Oriol", "Sergi", "Joan", "Dani", "Biel", "Èric", "Adrià", "Nil", "Hugo", "Iker", "Unai", "Raúl", "Víctor", "Gerard", "Roger", "Max"];
const FEMALE = ["Laia", "Júlia", "Marta", "Clàudia", "Aina", "Paula", "Carla", "Núria", "Anna", "Irene", "Ona", "Berta", "Martina", "Sara", "Lucía", "Noa", "Abril", "Mireia", "Emma", "Jana", "Elena", "Txell"];
const SURNAMES = ["Vidal", "Puig", "Soler", "Ferrer", "Serra", "Font", "Roca", "Vila", "Riera", "Pujol", "Mas", "Costa", "Bosch", "Sala", "Camps", "Prat", "Molina", "Romero", "Navarro", "Torres", "Ruiz", "Gil", "Marín", "Ortega", "Castro", "Rovira", "Casals", "Valls"];
const RIVALS = ["UE Muntanya", "CF Ciutat Vella", "CE Riu Blanc", "AE Pla de Mar", "CF Turó", "UD Les Fonts", "CE Vall Alta", "FC Collserola", "UE Port Nou", "CD Rambla", "CF Sant Roc", "AD Can Serra"];

const TEAMS = [
  { name: "Primer equip masculí", shortName: "Masc. A", gender: "M" as const, competition: "Competición por confirmar", federation: "RFEF" },
  { name: "Primer equip femení", shortName: "Fem. A", gender: "F" as const, competition: "Competición por confirmar", federation: "FCF" },
  { name: "Masculí B / Amateur", shortName: "Masc. B", gender: "M" as const, competition: "Competición por confirmar", federation: "FCF" },
  { name: "Femení B", shortName: "Fem. B", gender: "F" as const, competition: "Competición por confirmar", federation: "FCF" },
];
const SHAPE: Position[] = ["POR", "POR", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "MED", "MED", "MED", "MED", "MED", "MED", "MED", "DEL", "DEL", "DEL", "DEL"];

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

async function main() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.clubTeams);
  if (n > 0 && !reset) {
    console.log("La base de datos ya tiene datos. Usa --reset para recrearla.");
    return;
  }
  if (reset) {
    for (const t of ["activity", "bids", "listings", "lineups", "ownerships", "members", "leagues", "player_stats", "matches", "gameweeks", "players", "club_teams", "users"]) {
      await db.run(sql.raw(`delete from ${t}`));
    }
  }

  const teams = await db.insert(schema.clubTeams).values(TEAMS.map((t, i) => ({ ...t, sort: i }))).returning();

  const used = new Set<string>();
  for (const team of teams) {
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
    // Un jugador menor de edad para comprobar que el filtro de +18 funciona: no debe aparecer nunca.
    rows.push({ clubTeamId: team.id, name: `Juvenil Prova ${team.shortName}`, birthDate: "2010-06-01", position: "MED", shirtNumber: 30, value: 500_000 });
    await db.insert(schema.players).values(rows);
  }

  // Jornadas: la 1 ya jugada, la 2 en curso (hoy), de la 3 en adelante cada fin de semana.
  const now = new Date();
  const day = (offset: number, h: number) => {
    const d = new Date(now.getTime() + offset * 86_400_000);
    return madridToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h);
  };
  const gwRows = [{ number: 1, name: "Jornada 1", deadline: day(-7, 10) }, { number: 2, name: "Jornada 2", deadline: now.getTime() - 60 * 60_000 }];
  for (let i = 3; i <= 12; i++) gwRows.push({ number: i, name: `Jornada ${i}`, deadline: day(7 * (i - 2) - 1, 10) });
  const gws = await db.insert(schema.gameweeks).values(gwRows).returning();

  let r = 0;
  for (const gw of gws) {
    for (const [ti, team] of teams.entries()) {
      const kickoff = gw.number === 2 && ti === 0 ? now.getTime() - 50 * 60_000 : gw.deadline + ti * 2 * 60 * 60_000 + (ti >= 2 ? 86_400_000 : 0);
      await db.insert(schema.matches).values({
        gameweekId: gw.id, clubTeamId: team.id, opponent: RIVALS[r++ % RIVALS.length], isHome: (gw.number + ti) % 2 === 0, kickoff,
        status: gw.number === 2 && ti === 0 ? "live" : "scheduled", minute: gw.number === 2 && ti === 0 ? 50 : null,
        goalsFor: gw.number === 2 && ti === 0 ? 1 : 0, updatedAt: Date.now(),
      });
    }
  }

  // Usuarios de prueba.
  const hash = await bcrypt.hash("europa1234", 10);
  const users = await db.insert(schema.users).values([
    { email: "admin@europa.test", name: "Admin", passwordHash: await bcrypt.hash("admin1234", 10), isAdmin: true, createdAt: Date.now() },
    { email: "laia@europa.test", name: "Laia", passwordHash: hash, createdAt: Date.now() },
    { email: "pol@europa.test", name: "Pol", passwordHash: hash, createdAt: Date.now() },
    { email: "marta@europa.test", name: "Marta", passwordHash: hash, createdAt: Date.now() },
  ]).returning();

  // Las alineaciones iniciales se guardan en la jornada abierta; las movemos a la jornada 1 para que puntúen.
  const league = await createLeague({ name: "Liga de prueba", isPublic: false, ownerId: users[0].id });
  const teamNames = ["Escapulats FC", "Les Graciencs", "Penya Fabra", "Vila de Gràcia"];
  for (const [i, u] of users.entries()) {
    const m = await joinLeague(u.id, league.id, teamNames[i]);
    await db.update(schema.lineups).set({ gameweekId: gws[0].id }).where(sql`${schema.lineups.memberId} = ${m.id}`);
  }
  await createLeague({ name: "Liga Pública #1", isPublic: true, ownerId: null });

  // Actas de la jornada 1.
  const gw1Matches = await db.select().from(schema.matches).where(sql`${schema.matches.gameweekId} = ${gws[0].id}`);
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
  console.log("Datos de ejemplo creados.");
  console.log("  Admin:   admin@europa.test / admin1234");
  console.log("  Jugador: laia@europa.test / europa1234 (también pol@ y marta@)");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
