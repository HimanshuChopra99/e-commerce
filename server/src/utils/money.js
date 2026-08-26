/**
 * Money helpers.
 *
 * Every calculation happens in integer cents:
 *
 *   0.1 + 0.2 === 0.30000000000000004   ← floats lose money
 *   10  + 20  === 30                    ← cents are exact
 *
 * The database stores DECIMAL(10,2) and mysql2 returns it as a string
 * (decimalNumbers: false), so a float can never sneak in.
 */

/** "129.99" | 129.99 -> 12999 */
export function toCents(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n =
    typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return 0;
  // Round via a string to dodge 129.99 * 100 === 12998.999999999998
  return Math.round(Number((n * 100).toFixed(4)));
}

/** 12999 -> "129.99"  (safe to hand straight to a DECIMAL column) */
export function fromCents(cents) {
  return (Math.round(cents) / 100).toFixed(2);
}

/** 12999 -> 129.99   (for JSON responses) */
export function centsToNumber(cents) {
  return Math.round(cents) / 100;
}

/** A DB DECIMAL string -> a JSON number. Null-safe. */
export function decimalToNumber(value) {
  if (value === null || value === undefined) return null;
  return Number.parseFloat(String(value));
}

/** Percentage of an amount, in cents, optionally capped. */
export function percentOf(cents, percent, maxCents = null) {
  const off = Math.round((cents * percent) / 100);
  return maxCents === null ? off : Math.min(off, maxCents);
}

/** Format for emails / invoices. */
export function formatMoney(cents, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    centsToNumber(cents)
  );
}
