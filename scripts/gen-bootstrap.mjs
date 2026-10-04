/**
 * Genera src/db/bootstrap-sql.ts a partir de src/db/schema.ts.
 * La app ejecuta estas sentencias al arrancar para crear las tablas que falten (no hace falta terminal).
 * Ejecútalo cada vez que cambies el esquema:  npm run db:bootstrap
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "fe-sql-"));
execSync(`npx drizzle-kit generate --dialect sqlite --schema ./src/db/schema.ts --out ${out}`, { stdio: "ignore" });
const file = readdirSync(out).find((f) => f.endsWith(".sql"));
const sql = readFileSync(join(out, file), "utf8");
rmSync(out, { recursive: true, force: true });

const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) =>
    s
      .replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ")
      .replace(/^CREATE UNIQUE INDEX /, "CREATE UNIQUE INDEX IF NOT EXISTS ")
      .replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS "),
  );

writeFileSync(
  "src/db/bootstrap-sql.ts",
  `// Archivo generado por scripts/gen-bootstrap.mjs (npm run db:bootstrap). No lo edites a mano.\nexport const BOOTSTRAP_SQL: string[] = ${JSON.stringify(statements, null, 2)};\n`,
);
console.log(`src/db/bootstrap-sql.ts: ${statements.length} sentencias`);
