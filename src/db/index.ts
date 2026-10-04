import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Base de datos:
 *  - DATABASE_URL (o TURSO_DATABASE_URL si la creas desde la integración de Turso en Vercel) -> base de datos real.
 *  - En Vercel sin base de datos configurada -> MODO DEMO: SQLite temporal en /tmp con datos de ejemplo.
 *    Sirve para verlo funcionar, pero los datos se pierden cada vez que Vercel reinicia el servidor.
 *  - En local -> archivo local.db.
 */
const configuredUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
export const isDemoDb = !configuredUrl && !!process.env.VERCEL;
const url = configuredUrl || (isDemoDb ? "file:/tmp/fantasy-demo.db" : "file:local.db");
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof drizzle<typeof schema>> };

export const db = globalForDb.__db ?? drizzle(createClient({ url, authToken }), { schema });

if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
