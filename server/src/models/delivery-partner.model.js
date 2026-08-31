import { query, queryOne, isDatabaseConnected } from '../config/database.js';
import { publicId as genPublicId } from '../utils/helpers.js';

export function mapPartner(row) {
  if (!row) return null;
  return {
    id: row.public_id,
    publicId: row.public_id,
    internalId: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone ?? null,
    vehicleType: row.vehicle_type,
    isOnline: Boolean(row.is_online),
    currentLat: row.current_lat != null ? Number(row.current_lat) : null,
    currentLng: row.current_lng != null ? Number(row.current_lng) : null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findByEmail(email) {
  if (!isDatabaseConnected()) return null;
  const row = await queryOne(
    'SELECT *, password_hash FROM delivery_partners WHERE email = ? LIMIT 1',
    [email]
  );
  return row ? { ...mapPartner(row), passwordHash: row.password_hash } : null;
}

export async function findByPublicId(publicId) {
  if (!isDatabaseConnected()) return null;
  const row = await queryOne(
    'SELECT * FROM delivery_partners WHERE public_id = ? LIMIT 1',
    [publicId]
  );
  return row ? mapPartner(row) : null;
}

export async function findByInternalId(id) {
  if (!isDatabaseConnected()) return null;
  const row = await queryOne(
    'SELECT * FROM delivery_partners WHERE id = ? LIMIT 1',
    [id]
  );
  return row ? mapPartner(row) : null;
}

export async function create({
  firstName,
  lastName,
  email,
  passwordHash,
  phone,
  vehicleType,
}) {
  const pid = genPublicId();
  await query(
    `INSERT INTO delivery_partners (public_id, first_name, last_name, email, password_hash, phone, vehicle_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      pid,
      firstName,
      lastName,
      email,
      passwordHash,
      phone ?? null,
      vehicleType ?? 'bike',
    ]
  );
  return findByPublicId(pid);
}

/**
 * Paginated admin list with search + filters.
 * Returns `{ items, total }` so the controller can wrap it in the paginated envelope.
 */
export async function list({
  search,
  status,
  vehicleType,
  sort = 'created_desc',
  limit = 20,
  offset = 0,
} = {}) {
  if (!isDatabaseConnected()) return { items: [], total: 0 };

  const where = [];
  const params = [];

  if (search) {
    where.push(`(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?
                 OR phone LIKE ? OR vehicle_type LIKE ?
                 OR CONCAT(first_name, ' ', last_name) LIKE ?)`);
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (vehicleType) {
    where.push('vehicle_type = ?');
    params.push(vehicleType);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const ORDER =
    {
      created_desc: 'created_at DESC',
      created_asc: 'created_at ASC',
      name_asc: 'first_name ASC, last_name ASC',
    }[sort] ?? 'created_at DESC';

  const rows = await query(
    `SELECT * FROM delivery_partners ${whereSql} ORDER BY ${ORDER} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM delivery_partners ${whereSql}`,
    params
  );

  return {
    items: (rows ?? []).map(mapPartner),
    total: Number(countRow?.total ?? 0),
  };
}

/** Delivery statistics derived from the orders a partner is assigned to. */
export async function getStats(internalId) {
  if (!isDatabaseConnected()) {
    return {
      totalDeliveries: 0,
      deliveredCount: 0,
      inTransitCount: 0,
      deliveredToday: 0,
      earnings: 0,
      earningsToday: 0,
    };
  }
  const row = await queryOne(
    `SELECT
       COUNT(*)                                                    AS total_deliveries,
       SUM(status = 'delivered')                                   AS delivered_count,
       SUM(status IN ('assigned', 'shipping', 'ready_for_pickup')) AS in_transit_count,
       SUM(status = 'delivered' AND updated_at >= CURDATE())       AS delivered_today,
       COALESCE(SUM(CASE WHEN status = 'delivered' THEN grand_total * 0.08 ELSE 0 END), 0)                      AS earnings,
       COALESCE(SUM(CASE WHEN status = 'delivered' AND updated_at >= CURDATE() THEN grand_total * 0.08 ELSE 0 END), 0) AS earnings_today
     FROM orders
     WHERE delivery_partner_id = ?`,
    [internalId]
  );
  return {
    totalDeliveries: Number(row?.total_deliveries ?? 0),
    deliveredCount: Number(row?.delivered_count ?? 0),
    inTransitCount: Number(row?.in_transit_count ?? 0),
    deliveredToday: Number(row?.delivered_today ?? 0),
    earnings: Number(row?.earnings ?? 0),
    earningsToday: Number(row?.earnings_today ?? 0),
  };
}

/** Orders assigned to a partner, newest first. */
export async function findOrders(internalId, { limit = 20, offset = 0 } = {}) {
  if (!isDatabaseConnected()) return { items: [], total: 0 };
  const { mapOrder } = await import('./order.model.js');
  const rows = await query(
    `SELECT * FROM orders WHERE delivery_partner_id = ? ORDER BY placed_at DESC, id DESC LIMIT ? OFFSET ?`,
    [internalId, limit, offset]
  );
  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM orders WHERE delivery_partner_id = ?`,
    [internalId]
  );
  return {
    items: (rows ?? []).map(mapOrder),
    total: Number(countRow?.total ?? 0),
  };
}

/** Update editable profile fields. Only keys present in `patch` are written. */
export async function update(internalId, patch) {
  const sets = [];
  const params = [];

  for (const [key, column] of Object.entries({
    firstName: 'first_name',
    lastName: 'last_name',
    email: 'email',
    phone: 'phone',
    vehicleType: 'vehicle_type',
    status: 'status',
    isOnline: 'is_online',
  })) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(
        typeof patch[key] === 'boolean' ? Number(patch[key]) : patch[key]
      );
    }
  }

  if (sets.length) {
    params.push(internalId);
    await query(
      `UPDATE delivery_partners SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
  }

  return findByInternalId(internalId);
}

/** Update just the password hash (admin password reset). */
export async function updatePassword(internalId, passwordHash) {
  await query('UPDATE delivery_partners SET password_hash = ? WHERE id = ?', [
    passwordHash,
    internalId,
  ]);
}

/** Permanently delete a delivery partner. Returns true if a row was removed. */
export async function remove(internalId) {
  if (!isDatabaseConnected()) return false;
  const result = await query('DELETE FROM delivery_partners WHERE id = ?', [
    internalId,
  ]);
  return Boolean(result?.affectedRows);
}

export async function setOnlineStatus(internalId, isOnline) {
  await query('UPDATE delivery_partners SET is_online = ? WHERE id = ?', [
    isOnline,
    internalId,
  ]);
  return findByInternalId(internalId);
}

export async function updateLocation(internalId, lat, lng) {
  await query(
    'UPDATE delivery_partners SET current_lat = ?, current_lng = ? WHERE id = ?',
    [lat, lng, internalId]
  );
}

export async function emailExists(email) {
  if (!isDatabaseConnected()) return false;
  const row = await queryOne(
    'SELECT id FROM delivery_partners WHERE email = ? LIMIT 1',
    [email]
  );
  return Boolean(row);
}

export async function findOnlineWithLocation(staleMinutes = 15) {
  if (!isDatabaseConnected()) return [];
  const rows = await query(
    `SELECT id, public_id, current_lat, current_lng
     FROM delivery_partners
     WHERE is_online = 1
       AND current_lat IS NOT NULL AND current_lng IS NOT NULL
       AND updated_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [staleMinutes]
  );
  return (rows ?? []).map((r) => ({
    internalId: r.id,
    publicId: r.public_id,
    lat: Number(r.current_lat),
    lng: Number(r.current_lng),
  }));
}
