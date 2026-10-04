import { sql } from "drizzle-orm";
import { db, isRemoteDb } from "./index";
import { BOOTSTRAP_SQL } from "./bootstrap-sql";

let ready: Promise<void> | null = null;

/** Reintenta si otro servidor está escribiendo a la vez (SQLITE_BUSY). */
async function retry<T>(fn: () => Promise<T>, tries = 8): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries || !/BUSY|locked/i.test(String((e as Error)?.message) + String((e as { cause?: unknown })?.cause))) throw e;
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
    }
  }
}

const DATA_TABLES = ["activity", "bids", "listings", "lineups", "ownerships", "members", "leagues", "player_stats", "matches", "gameweeks", "players", "club_teams", "clubs", "users"];

/**
 * Crea las tablas que falten (idempotente, seguro aunque varios servidores arranquen a la vez).
 * Nunca mete datos por su cuenta: el club de prueba se carga con un botón en /admin/clubes.
 */
export function ensureDb(): Promise<void> {
  ready ??= (async () => {
    for (const stmt of BOOTSTRAP_SQL) await retry(() => db.run(sql.raw(stmt)));

    // Limpieza única: la versión anterior podía meter datos de ejemplo a medias y duplicados
    // (varios servidores a la vez). Solo eran datos de prueba (usuarios @europa.test), así que se vacía.
    if (isRemoteDb) {
      const junk = await db.all<{ n: number }>(sql`select count(*) as n from users where email like '%@europa.test'`);
      if (Number(junk[0]?.n) > 0) {
        await db.transaction(async (tx) => {
          for (const t of DATA_TABLES) await tx.run(sql.raw(`delete from \`${t}\``));
        });
      }
    }
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
