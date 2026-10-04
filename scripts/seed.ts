/**
 * Datos de DEMOSTRACIÓN para probar en local (con usuarios de prueba e historial).
 * En producción no hace falta: la app crea sola las tablas y los datos base al arrancar.
 *
 *   npm run db:seed            -> crea datos si la BD está vacía
 *   npm run db:seed -- --reset -> borra todo y vuelve a crear
 */
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { ensureDb } from "../src/db/bootstrap";
import { seedBaseData } from "../src/db/demo";
import { applyActa, createLeague, joinLeague, settleMarket, type ActaLine } from "../src/lib/game";

const reset = process.argv.includes("--reset");

async function main() {
  process.env.SEED_DEMO = "0";
  await ensureDb();
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

  // Temporada empezada: la jornada 1 ya se jugó, la 2 está en curso.
  const { gws } = await seedBaseData({ firstWeekOffset: -2 });
  const now = Date.now();
  await db.update(schema.gameweeks).set({ deadline: now - 60 * 60_000 }).where(eq(schema.gameweeks.id, gws[1].id));
  const gw2 = await db.select().from(schema.matches).where(eq(schema.matches.gameweekId, gws[1].id));
  for (const [i, m] of gw2.entries()) {
    await db
      .update(schema.matches)
      .set(i === 0 ? { kickoff: now - 50 * 60_000, status: "live", minute: 50, goalsFor: 1 } : { kickoff: now + (i + 1) * 3_600_000 })
      .where(eq(schema.matches.id, m.id));
  }

  const hash = await bcrypt.hash("europa1234", 10);
  const users = await db.insert(schema.users).values([
    { email: "admin@europa.test", name: "Admin", passwordHash: await bcrypt.hash("admin1234", 10), isAdmin: true, createdAt: now },
    { email: "laia@europa.test", name: "Laia", passwordHash: hash, createdAt: now },
    { email: "pol@europa.test", name: "Pol", passwordHash: hash, createdAt: now },
    { email: "marta@europa.test", name: "Marta", passwordHash: hash, createdAt: now },
  ]).returning();

  // Las alineaciones iniciales se crean en la jornada abierta; se mueven a la 1 para que puntúen.
  const league = await createLeague({ name: "Liga de prueba", isPublic: false, ownerId: users[0].id });
  const teamNames = ["Escapulats FC", "Les Graciencs", "Penya Fabra", "Vila de Gràcia"];
  for (const [i, u] of users.entries()) {
    const m = await joinLeague(u.id, league.id, teamNames[i]);
    await db.update(schema.lineups).set({ gameweekId: gws[0].id }).where(eq(schema.lineups.memberId, m.id));
  }

  let s = 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const gw1 = await db.select().from(schema.matches).where(eq(schema.matches.gameweekId, gws[0].id));
  const all = await db.select().from(schema.players);
  for (const match of gw1) {
    const squad = all.filter((p) => p.clubTeamId === match.clubTeamId && p.birthDate < "2008-01-01");
    const gf = Math.floor(rnd() * 4);
    const ga = Math.floor(rnd() * 3);
    const xi = [squad.find((p) => p.position === "POR")!, ...squad.filter((p) => p.position === "DEF").slice(0, 4), ...squad.filter((p) => p.position === "MED").slice(0, 4), ...squad.filter((p) => p.position === "DEL").slice(0, 2)];
    const lines: ActaLine[] = xi.map((p) => ({ playerId: p.id, minutes: rnd() < 0.2 ? 65 : 90, goals: 0, ownGoals: 0, yellow: rnd() < 0.15 ? 1 : 0, red: false, penSaved: 0, penMissed: 0 }));
    for (let g = 0; g < gf; g++) lines[1 + Math.floor(rnd() * 10)].goals++;
    await applyActa(match.id, gf, ga, lines);
  }

  await settleMarket(league.id);
  console.log("Datos de demostración creados.");
  console.log("  Admin:   admin@europa.test / admin1234");
  console.log("  Jugador: laia@europa.test / europa1234 (también pol@ y marta@)");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
