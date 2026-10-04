import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:local.db";

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof drizzle<typeof schema>> };

export const db =
  globalForDb.__db ??
  drizzle(createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN }), { schema });

if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
