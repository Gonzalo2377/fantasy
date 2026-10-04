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
    // Base de datos creada con la versión antigua (sin clubs): en demo se rehace; si es real, avisa.
    const cols = await db.all<{ name: string }>(sql`select name from pragma_table_info('leagues')`);
    if (cols.length && !cols.some((c) => c.name === "club_id")) {
      if (!isDemoDb) throw new Error("La base de datos es de una versión antigua sin clubs: hay que migrarla o vaciarla.");
      const tables = await db.all<{ name: string }>(sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%'`);
      await db.run(sql.raw("pragma foreign_keys = off"));
      for (const t of tables) await db.run(sql.raw(`drop table if exists \`${t.name}\``));
      await db.run(sql.raw("pragma foreign_keys = on"));
    }
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
