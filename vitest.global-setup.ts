// Runs ONCE in the main process before any worker starts:
// creates the dedicated test database with no competing connections.
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export default function globalSetup() {
  const testDb = path.resolve(__dirname, "prisma", "test.db");
  const url = `file:${testDb.replace(/\\/g, "/")}`;

  fs.rmSync(testDb, { force: true });
  fs.rmSync(`${testDb}-journal`, { force: true });

  execSync("npx prisma db push --skip-generate", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: url },
  });
}
