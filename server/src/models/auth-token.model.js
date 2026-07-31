import { query, queryOne } from '../config/database.js'

/**
 * One table for refresh sessions, password resets and email verification,
 * separated by `type`.
 *
 * Only the SHA-256 hash of a token is stored. If the database leaks, an
 * attacker gets useless hashes rather than live sessions.
 */

export async function create({ userId, type, tokenHash, expiresAt, userAgent, ipAddress }) {
  await query(
    `INSERT INTO auth_tokens (user_id, type, token_hash, expires_at, user_agent, ip_address)
     VALUES (?,?,?,?,?,?)`,
    [userId, type, tokenHash, expiresAt, userAgent?.slice(0, 255) ?? null, ipAddress ?? null]
  )
}

/** Finds an unused, unexpired token of the given type. */
export async function findActive(tokenHash, type) {
  const row = await queryOne(
    `SELECT id, user_id, type, expires_at
     FROM auth_tokens
     WHERE token_hash = ? AND type = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash, type]
  )
  if (!row) return null
  return { id: row.id, userId: row.user_id, type: row.type, expiresAt: row.expires_at }
}

export async function consume(id) {
  await query('UPDATE auth_tokens SET used_at = NOW() WHERE id = ?', [id])
}

/** Revokes every token of a type for a user — used on password reset / logout-all. */
export async function revokeAllForUser(userId, type = 'refresh') {
  await query(
    'UPDATE auth_tokens SET used_at = NOW() WHERE user_id = ? AND type = ? AND used_at IS NULL',
    [userId, type]
  )
}

/** Housekeeping: drop rows that are expired or long used. */
export async function purgeExpired() {
  const result = await query(
    `DELETE FROM auth_tokens
     WHERE expires_at < NOW()
        OR (used_at IS NOT NULL AND used_at < DATE_SUB(NOW(), INTERVAL 7 DAY))
     LIMIT 5000`
  )
  return result.affectedRows ?? 0
}

export async function countActiveSessions(userId) {
  const row = await queryOne(
    `SELECT COUNT(*) AS n FROM auth_tokens
     WHERE user_id = ? AND type = 'refresh' AND used_at IS NULL AND expires_at > NOW()`,
    [userId]
  )
  return Number(row?.n ?? 0)
}
