// Copia las migraciones SQL de drizzle/ a src/db/migrations.ts para aplicarlas al arrancar la app.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
const list = files.map((f) => ({
  id: f.replace(/\.sql$/, ""),
  statements: readFileSync(`drizzle/${f}`, "utf8").split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean),
}));
writeFileSync(
  "src/db/migrations.ts",
  `// Generado por scripts/embed-migrations.mjs (npm run db:generate). No editar a mano.\nexport const MIGRATIONS: { id: string; statements: string[] }[] = ${JSON.stringify(list, null, 2)};\n`,
);
console.log(`Migraciones embebidas: ${files.join(", ")}`);
