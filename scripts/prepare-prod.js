/**
 * Vercel build helper: the repo schema stays SQLite for local dev and
 * tests, but production runs on Neon Postgres. Prisma can't take the
 * provider from an env var, so the Vercel build swaps the provider
 * literal before `prisma generate` and `next build`.
 */
const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (!/provider = "postgresql"/.test(schema)) {
  schema = schema.replace(/provider = "sqlite"/, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  console.log("[prepare-prod] Prisma provider switched to postgresql.");
} else {
  console.log("[prepare-prod] Prisma provider already postgresql.");
}
