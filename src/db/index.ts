import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Conexión a la base de datos. Acepta las variables propias (DATABASE_URL/DATABASE_AUTH_TOKEN)
 * o las que crea automáticamente la integración de Turso en Vercel (TURSO_DATABASE_URL/TURSO_AUTH_TOKEN).
 * Sin configurar, en Vercel usa un archivo temporal (sirve para echar un vistazo, pero se borra).
 */
export const DB_URL =
  process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? (process.env.VERCEL ? "file:/tmp/fantasy.db" : "file:local.db");
export const DB_TOKEN = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof drizzle<typeof schema>> };

export const db = globalForDb.__db ?? drizzle(createClient({ url: DB_URL, authToken: DB_TOKEN }), { schema });

if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
