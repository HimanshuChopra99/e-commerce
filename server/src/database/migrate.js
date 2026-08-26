/**
 * Applies schema.sql, then any file in migrations/ that hasn't run yet.
 *
 *   node src/database/migrate.js            # apply pending
 *   node src/database/migrate.js --fresh    # DROP the database first
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(HERE, 'migrations');

/**
 * Splits a SQL script into individual statements.
 *
 * Comments are stripped and quoted strings respected, so a `;` inside
 * '...' or a `--` inside a string doesn't split the statement wrongly.
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];
    const inString = inSingle || inDouble || inBacktick;

    // Line comment: skip to end of line (outside strings only)
    if (!inString && ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      current += '\n';
      continue;
    }
    // Block comment
    if (!inString && ch === '/' && next === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i += 1;
      i += 1;
      continue;
    }

    if (ch === "'" && !inDouble && !inBacktick && sql[i - 1] !== '\\')
      inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inBacktick && sql[i - 1] !== '\\')
      inDouble = !inDouble;
    else if (ch === '`' && !inSingle && !inDouble) inBacktick = !inBacktick;

    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }
    current += ch;
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

export async function migrateDatabase({ fresh = false } = {}) {
  // Connect without a database first, so we can create it.
  const root = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    socketPath: env.db.socketPath,
    multipleStatements: false,
  });

  if (fresh) {
    logger.warn({ database: env.db.database }, 'dropping database (--fresh)');
    await root.query(`DROP DATABASE IF EXISTS \`${env.db.database}\``);
  }

  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await root.end();

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    socketPath: env.db.socketPath,
  });

  // Base schema is idempotent (CREATE TABLE IF NOT EXISTS).
  const schema = await fs.readFile(path.join(HERE, 'schema.sql'), 'utf8');
  for (const statement of splitStatements(schema)) {
    await conn.query(statement);
  }
  logger.info('schema applied');

  // Incremental migrations.
  let files = [];
  try {
    files = (await fs.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    files = [];
  }

  const [applied] = await conn.query('SELECT filename FROM schema_migrations');
  const done = new Set(applied.map((r) => r.filename));
  const pending = files.filter((f) => !done.has(f));

  if (!pending.length) {
    logger.info('no pending migrations');
  }

  for (const file of pending) {
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    await conn.beginTransaction();
    try {
      for (const statement of splitStatements(sql)) {
        await conn.query(statement);
      }
      await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [
        file,
      ]);
      await conn.commit();
      logger.info({ file }, 'migration applied');
    } catch (err) {
      await conn.rollback();
      logger.error({ err, file }, 'migration failed — rolled back');
      await conn.end();
      process.exit(1);
    }
  }

  await conn.end();
  logger.info('migrations complete');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrateDatabase({ fresh: process.argv.includes('--fresh') }).catch((err) => {
    logger.fatal({ err }, 'migration runner failed');
    process.exit(1);
  });
}
