import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Base de datos:
 *  - DATABASE_URL (o TURSO_DATABASE_URL si la creas desde la integración de Turso en Vercel) -> base de datos real.
 *  - En local, sin nada configurado -> archivo local.db.
 *  - En Vercel hace falta una base de datos real: cada página se ejecuta en un servidor distinto,
 *    así que un archivo local no sirve. Sin ella la app muestra cómo configurarla en vez de fallar.
 */
const configuredUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
export const dbConfigured = !!configuredUrl || !process.env.VERCEL;
export const isRemoteDb = !!configuredUrl && !configuredUrl.startsWith("file:");
const url = configuredUrl || (process.env.VERCEL ? "file:/tmp/sin-configurar.db" : "file:local.db");
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof drizzle<typeof schema>> };

export const db = globalForDb.__db ?? drizzle(createClient({ url, authToken }), { schema });

if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
