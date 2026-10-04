import { sql } from "drizzle-orm";
import { db, schema } from "./index";
import { seedBaseData } from "./demo";
import { MIGRATIONS } from "./migrations";

let done: Promise<void> | null = null;

/**
 * Prepara la base de datos al arrancar: crea/actualiza las tablas y, si está vacía,
 * carga los equipos, una plantilla de ejemplo y el calendario para poder jugar desde el primer momento.
 */
export function ensureDb() {
  done ??= (async () => {
    await db.run(sql`create table if not exists _migrations (id text primary key, applied_at integer not null)`);
    const applied = new Set((await db.all<{ id: string }>(sql`select id from _migrations`)).map((r) => r.id));
    // Bases creadas antes con "drizzle-kit push" ya tienen las tablas: se marcan como aplicadas.
    const hasTables = (await db.all(sql`select name from sqlite_master where type='table' and name='users'`)).length > 0;
    for (const m of MIGRATIONS) {
      if (applied.has(m.id)) continue;
      if (!(hasTables && m.id.startsWith("0000"))) {
        for (const statement of m.statements) await db.run(sql.raw(statement));
      }
      await db.run(sql`insert into _migrations (id, applied_at) values (${m.id}, ${Date.now()})`);
    }
    if (process.env.SEED_DEMO !== "0") {
      const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(schema.clubTeams);
      if (n === 0) await seedBaseData();
    }
  })().catch((e) => {
    done = null;
    throw e;
  });
  return done;
}
