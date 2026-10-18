import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { seed } from "./seed";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/**
 * DATABASE_URL set  -> real Postgres (Neon in production). Migrations run at build time.
 * DATABASE_URL unset -> embedded PGlite stored in ./.pglite, auto-migrated and seeded,
 *                       so `npm run dev` works with zero setup.
 */
async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5 });
    return drizzle(pool, { schema }) as unknown as Db;
  }
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PGLITE) {
    throw new Error("DATABASE_URL is required in production");
  }
  return createPgliteDb(path.join(process.cwd(), ".pglite"));
}

/** dataDir undefined = in-memory (used by tests). */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await seed(db as unknown as Db);
  return db as unknown as Db;
}

// Cache on globalThis so dev hot-reloads don't open a new pool/PGlite instance each time.
const g = globalThis as unknown as { __dbPromise?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__dbPromise) {
    g.__dbPromise = createDb().catch((err) => {
      g.__dbPromise = undefined;
      throw err;
    });
  }
  return g.__dbPromise;
}

/** Test hook: point the app at a specific database. */
export function setDbForTests(db: Db) {
  g.__dbPromise = Promise.resolve(db);
}

export { schema };
