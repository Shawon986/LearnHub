// Runner for the LOCAL database (SQLite client from @prisma/client).
// Production sync runs through scripts/sync-signature-courses.run.mjs with a
// generated postgres client (see comments there).
import { PrismaClient } from "@prisma/client";
import { syncSignatureCourses } from "./sync-signature-courses.mjs";

const db = new PrismaClient();

syncSignatureCourses(db)
  .then((r) => console.log("[sync] done:", JSON.stringify(r)))
  .catch((e) => {
    console.error("[sync] failed:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
