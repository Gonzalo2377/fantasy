import { sql } from "drizzle-orm";
import { db, isDemoDb, schema } from "./index";
import { BOOTSTRAP_SQL } from "./bootstrap-sql";

let ready: Promise<void> | null = null;

/**
 * Crea las tablas que falten (es idempotente) y, en modo demo o con SEED_DEMO=1, mete datos de ejemplo
 * si la base de datos está vacía. Se llama una vez al arrancar el servidor (src/instrumentation.ts).
 */
export function ensureDb(): Promise<void> {
  ready ??= (async () => {
    for (const stmt of BOOTSTRAP_SQL) await db.run(sql.raw(stmt));
    if (isDemoDb || process.env.SEED_DEMO === "1") {
      const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.clubTeams);
      if (Number(n) === 0) {
        const { seedDemo } = await import("@/lib/demo-seed");
        await seedDemo();
      }
    }
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
