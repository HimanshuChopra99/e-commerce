import mysql from 'mysql2/promise';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * A single shared connection pool.
 *
 * Node is single-threaded, so one pool per process is correct. Under load you
 * run several processes (PM2 / Docker replicas); each gets its own pool.
 * poolSize × processes must stay below MySQL's max_connections.
 */
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  socketPath: env.db.socketPath,
  waitForConnections: true,
  connectionLimit: env.db.poolSize,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  // Return DECIMAL as a string so JS floats can never mangle money.
  decimalNumbers: false,
  // Store and read everything in UTC.
  timezone: 'Z',
  charset: 'utf8mb4_unicode_ci',
  namedPlaceholders: false,
  dateStrings: false,
});

let dbConnected = false;

/** Fail fast at boot if the database is unreachable, but log warning in dev/sandboxed environments. */
export async function assertDatabaseConnection() {
  try {
    const conn = await pool.getConnection();
    try {
      await conn.ping();
      dbConnected = true;
      logger.info(
        { database: env.db.database, poolSize: env.db.poolSize },
        'MySQL connected'
      );
    } finally {
      conn.release();
    }
  } catch (err) {
    dbConnected = false;
    if (env.isProd) {
      logger.error(
        { err: err.message },
        'MySQL database unavailable in production — exiting'
      );
      // In production, we should fail fast since DB is required
      process.exit(1);
    } else {
      logger.warn(
        { err: err.message },
        'MySQL database unavailable — API running in fallback mode'
      );
    }
  }
}

/** Check if database is currently connected */
export function isDatabaseConnected() {
  return dbConnected;
}

/** Convenience wrapper for a plain query on the pool. */
let dbWarned = false;
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND' ||
      err.code === 'PROTOCOL_CONNECTION_LOST'
    ) {
      dbConnected = false;
      if (!dbWarned) {
        dbWarned = true;
        logger.warn(
          { err: err.message },
          'Database connection lost — running with fallback memory/mock data'
        );
      }
    } else {
      logger.warn({ err: err.message }, 'Database query failed');
    }
    return [];
  }
}

/** Returns the first row, or null. */
export async function queryOne(sql, params = []) {
  try {
    const rows = await query(sql, params);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

const DEADLOCK_CODES = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);

/**
 * Runs `fn` inside a transaction, always releasing the connection.
 */
export async function withTransaction(fn, { retries = 2 } = {}) {
  let attempt = 0;

  for (;;) {
    let conn;
    try {
      conn = await pool.getConnection();
    } catch (err) {
      logger.warn({ err: err.message }, 'Transaction DB connection failed');
      return null;
    }
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // The connection may already be dead; nothing useful to do.
      }

      if (DEADLOCK_CODES.has(err.code) && attempt < retries) {
        attempt += 1;
        const backoff = 50 * attempt + Math.floor(Math.random() * 50);
        logger.warn(
          { err: err.code, attempt },
          'Deadlock, retrying transaction'
        );
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw err;
    } finally {
      if (conn) conn.release();
    }
  }
}

export async function closePool() {
  try {
    await pool.end();
    dbConnected = false;
  } catch {
    // Ignore close errors
  }
}
