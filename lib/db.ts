import "server-only";
import { Pool, types, type QueryResultRow } from "pg";

// Return DATE columns as "YYYY-MM-DD" strings, so no timezone shifting happens.
types.setTypeParser(1082, (v) => v);

// One small pool per server instance. Neon needs SSL; a local test database doesn't.
const url = process.env.DATABASE_URL;
const local = !!url && /localhost|127\.0\.0\.1/.test(url);

const globalForDb = globalThis as unknown as { pool?: Pool };
export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: true },
    max: 3,
    idleTimeoutMillis: 10_000,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const res = await pool.query<T>(sql, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
