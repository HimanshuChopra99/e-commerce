/**
 * Central brand configuration.
 *
 * 👉 Change your store name / details here and it updates everywhere:
 *    sidebar header, page titles, browser tab, invoices, etc.
 */
export const brand = {
  name: 'Kick',
  tagline: 'Footwear Store',
  legalName: 'Kick Footwear Pvt. Ltd.',
  supportEmail: 'support@Kick.com',
}

/** Currency used across the admin. */
export const currency = {
  code: 'USD',
  symbol: '$',
  locale: 'en-US',
}

/** Format a number as a price string, e.g. 129.99 -> "$129.99" */
export function formatCurrency(value) {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Compact money for stat cards, e.g. 45231 -> "$45.2K" */
export function formatCompactCurrency(value) {
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/** Format a date consistently across the admin. */
export function formatDate(
  date,
  opts = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }
) {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(currency.locale, opts).format(d)
}

/** Format a date + time, e.g. "12 Mar 2026, 4:30 PM" */
export function formatDateTime(date) {
  return formatDate(date, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
