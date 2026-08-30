// Runner for the PRODUCTION database (Neon Postgres). Requires a generated
// postgres client: run `npx prisma generate --schema <pg-schema-with-output>`
// into a temp dir first, then:
//   DATABASE_URL=<neon-url> node scripts/sync-signature-courses.run.mjs
import { pathToFileURL } from "node:url";
import { syncSignatureCourses } from "./sync-signature-courses.mjs";

const CLIENT_DIR = process.env.PG_CLIENT_DIR ?? "/tmp/neon-pg-client";

const { PrismaClient } = await import(pathToFileURL(`${CLIENT_DIR}/index.js`).href);
const db = new PrismaClient();

syncSignatureCourses(db, { introspected: true })
  .then((r) => console.log("[sync] done:", JSON.stringify(r)))
  .catch((e) => {
    console.error("[sync] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
