// Applies migrations and idempotent seed data to DATABASE_URL. Runs on every Vercel build.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { Db } from "../src/db";
import * as schema from "../src/db/schema";
import { seed } from "../src/db/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("DATABASE_URL not set; skipping (local dev uses PGlite, which migrates itself).");
    return;
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  await seed(db as unknown as Db);
  await pool.end();
  console.log("Migrations + seed applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
