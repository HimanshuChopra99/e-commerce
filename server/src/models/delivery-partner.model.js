import { pool, query, queryOne, isDatabaseConnected } from '../config/database.js'
import { publicId as genPublicId } from '../utils/helpers.js'

export function mapPartner(row) {
  if (!row) return null
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
  }
}

export async function findByEmail(email) {
  if (!isDatabaseConnected()) return null
  const row = await queryOne(
    'SELECT *, password_hash FROM delivery_partners WHERE email = ? LIMIT 1', [email]
  )
  return row ? { ...mapPartner(row), passwordHash: row.password_hash } : null
}

export async function findByPublicId(publicId) {
  if (!isDatabaseConnected()) return null
  const row = await queryOne(
    'SELECT * FROM delivery_partners WHERE public_id = ? LIMIT 1', [publicId]
  )
  return row ? mapPartner(row) : null
}

export async function findByInternalId(id) {
  if (!isDatabaseConnected()) return null
  const row = await queryOne(
    'SELECT * FROM delivery_partners WHERE id = ? LIMIT 1', [id]
  )
  return row ? mapPartner(row) : null
}

export async function create({ firstName, lastName, email, passwordHash, phone, vehicleType }) {
  const pid = genPublicId()
  await query(
    `INSERT INTO delivery_partners (public_id, first_name, last_name, email, password_hash, phone, vehicle_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [pid, firstName, lastName, email, passwordHash, phone ?? null, vehicleType ?? 'bike']
  )
  return findByPublicId(pid)
}

export async function setOnlineStatus(internalId, isOnline) {
  await query('UPDATE delivery_partners SET is_online = ? WHERE id = ?', [isOnline, internalId])
}

export async function updateLocation(internalId, lat, lng) {
  await query(
    'UPDATE delivery_partners SET current_lat = ?, current_lng = ? WHERE id = ?',
    [lat, lng, internalId]
  )
}

export async function emailExists(email) {
  if (!isDatabaseConnected()) return false
  const row = await queryOne('SELECT id FROM delivery_partners WHERE email = ? LIMIT 1', [email])
  return Boolean(row)
}
