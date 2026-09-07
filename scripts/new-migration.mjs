/**
 * Crea una nueva migración a partir de los cambios en prisma/schema.prisma.
 *
 *   node scripts/new-migration.mjs <nombre>
 *
 * `prisma migrate dev` no funciona en entornos no interactivos, así que este
 * script genera el SQL con `migrate diff` y lo aplica con `migrate deploy`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Uso: node scripts/new-migration.mjs <nombre_en_snake_case>");
  process.exit(1);
}

const stamp = new Date()
  .toISOString()
  .replace(/[-:T]/g, "")
  .slice(0, 14);
const dir = path.join("prisma", "migrations", `${stamp}_${name}`);
mkdirSync(dir, { recursive: true });

const sql = execFileSync(
  "npx",
  [
    "prisma",
    "migrate",
    "diff",
    "--from-migrations",
    "./prisma/migrations",
    "--to-schema",
    "./prisma/schema.prisma",
    "--script",
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
);

if (!sql.trim() || sql.includes("-- This is an empty migration.")) {
  console.log("No hay cambios de schema para migrar.");
  process.exit(0);
}

writeFileSync(path.join(dir, "migration.sql"), sql);
console.log(`Migración creada: ${dir}/migration.sql`);
console.log("Revísala y luego ejecuta: npm run db:migrate:deploy");
