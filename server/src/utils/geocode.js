import { logger } from '../config/logger.js'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'KICKS-Ecommerce/1.0'
const TIMEOUT_MS = 5000

/**
 * Builds clean query candidate variations from an address object.
 */
export function buildAddressQueries(address) {
    if (!address) return []
    if (typeof address === 'string') return [address.trim().replace(/\s+/g, ' ')]

    const line1 = address.line1?.trim() || ''
    const line2 = address.line2?.trim() || ''
    const city = address.city?.trim() || ''
    const state = address.state?.trim() || ''
    const zip = (address.zip ?? address.postalCode ?? address.postal_code ?? '').toString().trim()
    const country = address.country?.trim() || ''

    // Build clean parts array, deduplicating terms that are already inside line1
    const rawParts = [line1, line2, city, state, zip, country].filter(Boolean)

    const deduplicatedParts = []
    for (const part of rawParts) {
        const isAlreadyIncluded = deduplicatedParts.some((existing) =>
            existing.toLowerCase().includes(part.toLowerCase())
        )
        if (!isAlreadyIncluded) {
            deduplicatedParts.push(part)
        }
    }

    // Primary full query
    const fullQuery = deduplicatedParts.join(', ').replace(/\s+/g, ' ')

    // Fallback 1: Without ZIP code (postal codes often cause OSM failures in India/Asia)
    const noZipQuery = deduplicatedParts
        .filter((p) => p !== zip)
        .join(', ')
        .replace(/\s+/g, ' ')

    // Fallback 2: Simple City + Country (guarantees coordinates for city center)
    const simpleQuery = [city, state, country].filter(Boolean).join(', ')

    // Return unique non-empty queries in order of priority
    return Array.from(new Set([fullQuery, noZipQuery, simpleQuery].filter(Boolean)))
}

/**
 * Helper to execute a single HTTP request to Nominatim
 */
async function fetchFromNominatim(query, signal) {
    const url = new URL(NOMINATIM_URL)
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')

    const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal,
    })

    if (!response.ok) return null

    const result = await response.json()
    const first = Array.isArray(result) ? result[0] : null
    if (!first) return null

    const lat = Number.parseFloat(first.lat)
    const lng = Number.parseFloat(first.lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

export async function geocodeAddress(address) {
    const queries = buildAddressQueries(address)
    if (queries.length === 0) return null

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        // Try candidates sequentially until one returns coordinates
        for (const query of queries) {
            const coords = await fetchFromNominatim(query, controller.signal)
            if (coords) {
                logger.info({ query, coords }, 'Geocode successful')
                return coords
            }
        }

        logger.debug({ address }, 'Geocode returned no matches after all fallbacks')
        return null
    } catch (error) {
        logger.warn({ err: error.message }, 'Geocode lookup errored — continuing without coordinates')
        return null
    } finally {
        clearTimeout(timer)
    }
}

export default geocodeAddress