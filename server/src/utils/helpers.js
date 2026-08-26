import crypto from 'node:crypto';
import { ulid } from 'ulid';

/**
 * A public, non-guessable id used in URLs and API responses.
 *
 * Why not expose the auto-increment `id`?
 *  1. Sequential ids leak business volume — /orders/1042 tells a competitor
 *     roughly how many orders you've taken.
 *  2. They invite enumeration: /orders/1, /orders/2, /orders/3…
 *
 * ULIDs are lexicographically sortable by creation time, so unlike UUIDv4 they
 * cluster newer rows together in the index instead of fragmenting the B-tree.
 */
export function publicId() {
  return ulid();
}

/** URL-safe slug: "Aero Runner 2.0" -> "aero-runner-2-0" */
export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

/**
 * Appends -2, -3 … until `existsFn(candidate)` returns false.
 * `ignoreId` lets an update keep its own slug.
 */
export async function uniqueSlug(base, existsFn, ignoreId = null) {
  const root = slugify(base) || 'item';
  if (!(await existsFn(root, ignoreId))) return root;

  for (let i = 2; i <= 100; i += 1) {
    const candidate = `${root}-${i}`;
    if (!(await existsFn(candidate, ignoreId))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** SHA-256 hex. Used to store tokens without storing the token. */
export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

/** A cryptographically random URL-safe token (for reset / verify links). */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Colour name -> a 3-letter SKU suffix. */
export function colorCode(color) {
  const map = {
    Black: 'BLK',
    White: 'WHT',
    Grey: 'GRY',
    Navy: 'NVY',
    Red: 'RED',
    Blue: 'BLU',
    Green: 'GRN',
    Brown: 'BRN',
    Tan: 'TAN',
    Beige: 'BEI',
    Pink: 'PNK',
    Yellow: 'YEL',
  };
  if (map[color]) return map[color];
  const cleaned = String(color)
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase();
  if (cleaned) return cleaned;
  // Hex/CSS colours may have no letters. A deterministic base36 hash keeps
  // automatically generated variant SKUs distinct and valid.
  const hash = [...String(color)].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0
  );
  return hash.toString(36).slice(-3).toUpperCase().padStart(3, '0');
}

/** Normalises an email for storage and lookup. */
export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/** Parses ?page= and ?limit= into safe LIMIT/OFFSET values. */
export function getPagination(
  query,
  { defaultLimit = 20, maxLimit = 100 } = {}
) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit)
  );
  return { page, limit, offset: (page - 1) * limit };
}

export function buildMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Safely parses a JSON column that may already be an object or be null. */
export function parseJson(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Escapes a value for a CSV cell. */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);

  // Spreadsheet applications interpret a cell beginning with one of these
  // characters as a formula. Customer-controlled fields (names, addresses,
  // notes, product labels) must remain text when staff open an export.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;

  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => csvCell(c.value(row))).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}
