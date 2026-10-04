/**
 *   npm run db:seed            -> crea las tablas y datos de ejemplo si la BD está vacía
 *   npm run db:seed -- --reset -> borra todo y vuelve a crear
 */
import { BOOTSTRAP_SQL } from "../src/db/bootstrap-sql";
import { db } from "../src/db";
import { sql } from "drizzle-orm";
import { seedDemo } from "../src/lib/demo-seed";

async function main() {
  for (const stmt of BOOTSTRAP_SQL) await db.run(sql.raw(stmt));
  const created = await seedDemo({ reset: process.argv.includes("--reset") });
  if (!created) return console.log("La base de datos ya tiene datos. Usa --reset para recrearla.");
  console.log("Datos de ejemplo creados.");
  console.log("  Admin:   admin@europa.test / admin1234");
  console.log("  Jugador: jugador@europa.test / europa1234  ·  Código de liga: EUROPA");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
