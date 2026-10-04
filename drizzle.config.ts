import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "file:local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

export default url.startsWith("libsql:")
  ? defineConfig({ schema: "./src/db/schema.ts", out: "./drizzle", dialect: "turso", dbCredentials: { url, authToken } })
  : defineConfig({ schema: "./src/db/schema.ts", out: "./drizzle", dialect: "sqlite", dbCredentials: { url } });
