import { sql } from "drizzle-orm";
import { db, schema } from "./index";
import type { Position } from "./schema";
import { madridToUtc } from "@/lib/time";

/*
 * Datos iniciales. Los nombres de jugadores y rivales son FICTICIOS:
 * se sustituyen por los reales desde /admin (importación CSV de plantillas).
 */

const MALE = ["Marc", "Pol", "Arnau", "Jordi", "Àlex", "Pau", "Oriol", "Sergi", "Joan", "Dani", "Biel", "Èric", "Adrià", "Nil", "Hugo", "Iker", "Unai", "Raúl", "Víctor", "Gerard", "Roger", "Max"];
const FEMALE = ["Laia", "Júlia", "Marta", "Clàudia", "Aina", "Paula", "Carla", "Núria", "Anna", "Irene", "Ona", "Berta", "Martina", "Sara", "Lucía", "Noa", "Abril", "Mireia", "Emma", "Jana", "Elena", "Txell"];
const SURNAMES = ["Vidal", "Puig", "Soler", "Ferrer", "Serra", "Font", "Roca", "Vila", "Riera", "Pujol", "Mas", "Costa", "Bosch", "Sala", "Camps", "Prat", "Molina", "Romero", "Navarro", "Torres", "Ruiz", "Gil", "Marín", "Ortega", "Castro", "Rovira", "Casals", "Valls"];
export const RIVALS = ["UE Muntanya", "CF Ciutat Vella", "CE Riu Blanc", "AE Pla de Mar", "CF Turó", "UD Les Fonts", "CE Vall Alta", "FC Collserola", "UE Port Nou", "CD Rambla", "CF Sant Roc", "AD Can Serra"];

const TEAMS = [
  { name: "Primer equip masculí", shortName: "Masc. A", gender: "M" as const, competition: "Competición por confirmar", federation: "RFEF" },
  { name: "Primer equip femení", shortName: "Fem. A", gender: "F" as const, competition: "Competición por confirmar", federation: "FCF" },
  { name: "Masculí B / Amateur", shortName: "Masc. B", gender: "M" as const, competition: "Competición por confirmar", federation: "FCF" },
  { name: "Femení B", shortName: "Fem. B", gender: "F" as const, competition: "Competición por confirmar", federation: "FCF" },
];
const SHAPE: Position[] = ["POR", "POR", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "DEF", "MED", "MED", "MED", "MED", "MED", "MED", "MED", "DEL", "DEL", "DEL", "DEL"];

/** Sábado más próximo (o hoy si es sábado) en Madrid, a la hora indicada. */
function nextSaturday(now: number, hour: number) {
  const d = new Date(now);
  const add = (6 - d.getUTCDay() + 7) % 7;
  const s = new Date(now + add * 86_400_000);
  return madridToUtc(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(), hour);
}

/**
 * Crea equipos, plantillas de ejemplo, 12 jornadas semanales con sus partidos y una liga pública.
 * `firstWeekOffset` permite empezar la temporada en el pasado (para los datos de demostración en local).
 */
export async function seedBaseData({ firstWeekOffset = 0, seed = 42 } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

  const teams = await db.insert(schema.clubTeams).values(TEAMS.map((t, i) => ({ ...t, sort: i }))).returning();

  const used = new Set<string>();
  for (const team of teams) {
    const rows = SHAPE.map((position, i) => {
      let name = "";
      do name = `${pick(team.gender === "F" ? FEMALE : MALE)} ${pick(SURNAMES)} ${pick(SURNAMES)}`;
      while (used.has(name));
      used.add(name);
      const year = 1991 + Math.floor(rnd() * 15);
      const birthDate = `${year}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}`;
      const base = team.shortName.endsWith("A") ? 1_400_000 : 700_000;
      return { clubTeamId: team.id, name, birthDate, position, shirtNumber: i + 1, value: Math.round((base + rnd() * base) / 10_000) * 10_000 };
    });
    // Jugador menor de edad de control: nunca debe aparecer en el juego.
    rows.push({ clubTeamId: team.id, name: `Juvenil Prova ${team.shortName}`, birthDate: "2010-06-01", position: "MED", shirtNumber: 30, value: 500_000 });
    await db.insert(schema.players).values(rows);
  }

  const firstDeadline = nextSaturday(Date.now(), 10) + firstWeekOffset * 7 * 86_400_000;
  const gws = await db
    .insert(schema.gameweeks)
    .values(Array.from({ length: 12 }, (_, i) => ({ number: i + 1, name: `Jornada ${i + 1}`, deadline: firstDeadline + i * 7 * 86_400_000 })))
    .returning();

  let r = 0;
  for (const gw of gws) {
    await db.insert(schema.matches).values(
      teams.map((team, ti) => ({
        gameweekId: gw.id,
        clubTeamId: team.id,
        opponent: RIVALS[r++ % RIVALS.length],
        isHome: (gw.number + ti) % 2 === 0,
        // Sábado: equipos A desde las 12:00; domingo: equipos B.
        kickoff: gw.deadline + (2 + ti * 2) * 3_600_000 + (ti >= 2 ? 86_400_000 - 4 * 3_600_000 : 0),
        updatedAt: Date.now(),
      })),
    );
  }

  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.leagues);
  if (n === 0) {
    await db.insert(schema.leagues).values({ name: "Liga Pública #1", isPublic: true, code: "PUBLI1", maxMembers: 8, createdAt: Date.now() });
  }
  return { teams, gws };
}
