import Fuse from 'fuse.js'
import { getCachedJson } from './cache.service.js'
import { findAll } from '../models/product.model.js'
import { logger } from '../config/logger.js'

let fuseIndex = null
let productCache = []
let lastBuilt = 0
const REBUILD_INTERVAL = 5 * 60 * 1000

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.50 },
    { name: 'brand', weight: 0.25 },
    { name: 'tags', weight: 0.12 },
    { name: 'category.name', weight: 0.08 },
    { name: 'description', weight: 0.03 },
    { name: 'material', weight: 0.02 },
  ],
  threshold: 0.40,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
}

const SYNONYMS = {
  'kicks': 'shoes',
  'sneakers': 'shoes',
  'trainers': 'shoes',
  'joggers': 'running shoes',
  'jorder': 'jordan',
  'jordon': 'jordan',
  'nikey': 'nike',
  'addidas': 'adidas',
  'adiddas': 'adidas',
  'rebook': 'reebok',
  'cheap': 'low price',
  'affordable': 'low price',
  'expensive': 'premium',
  'rain': 'waterproof outdoor',
  'raining': 'waterproof outdoor',
  'rainy': 'waterproof outdoor',
  'winter': 'boots insulated warm',
  'summer': 'breathable lightweight',
  'gym': 'training athletic sport',
  'casual': 'lifestyle casual',
  'formal': 'leather dress',
  'retro': 'classic vintage',
  'comfy': 'comfortable cushion',
}

const CATEGORY_EXPANSION = {
  'outdoor': 'waterproof trail grip durable',
  'running': 'sport athletic performance cushion',
  'basketball': 'court grip ankle support',
  'casual': 'everyday lifestyle comfort',
  'training': 'gym workout cross-training',
}

const MATERIAL_EXPANSION = {
  'Genuine Leather': 'premium durable formal classic',
  'Synthetic Leather': 'lightweight durable sport',
  'Canvas': 'casual breathable lightweight',
  'Mesh': 'breathable sport lightweight',
  'Suede': 'soft premium casual',
  'Nubuck': 'premium outdoor durable',
  'Knit': 'flexible breathable running',
}

function buildSearchDocument(product) {
  const categoryExpansion = CATEGORY_EXPANSION[product.category?.slug] || ''
  const materialExpansion = MATERIAL_EXPANSION[product.material] || ''
  return {
    ...product,
    _searchText: [
      product.name,
      product.brand,
      product.description,
      product.category?.name,
      product.material,
      product.gender,
      ...(product.tags || []),
      categoryExpansion,
      materialExpansion,
    ].filter(Boolean).join(' ').toLowerCase(),
  }
}

function normalizeQuery(query) {
  let q = query.toLowerCase().trim()
  for (const [alias, canonical] of Object.entries(SYNONYMS)) {
    q = q.replace(new RegExp(`\\b${alias}\\b`, 'gi'), canonical)
  }
  return q
}

export function extractPriceIntent(query) {
  const between = query.match(/between\s+\$?(\d+)\s+and\s+\$?(\d+)/i)
  const under = query.match(/under\s+\$?(\d+)/i)
  const above = query.match(/(?:above|over)\s+\$?(\d+)/i)
  const cheapest = /cheap|cheapest|lowest\s+price|most\s+affordable/i.test(query)
  const priciest = /expensive|premium|highest\s+price|most\s+expensive/i.test(query)

  if (between) return { minPrice: Number(between[1]), maxPrice: Number(between[2]) }
  if (under) return { maxPrice: Number(under[1]) }
  if (above) return { minPrice: Number(above[1]) }
  if (cheapest) return { sort: 'price_asc' }
  if (priciest) return { sort: 'price_desc' }
  return {}
}

export function extractGender(query) {
  if (/\b(women|woman|female|ladies)\b/i.test(query)) return 'women'
  if (/\b(men|male|guys)\b/i.test(query)) return 'men'
  if (/\b(kids|children|child)\b/i.test(query)) return 'kids'
  if (/\bunisex\b/i.test(query)) return 'unisex'
  return null
}

export function extractSize(query) {
  const match = query.match(/\bsize\s+(\d+(?:\.\d+)?)\b/i)
  return match ? match[1] : null
}

export function extractColor(query) {
  const COLORS = [
    'black', 'white', 'grey', 'gray', 'navy', 'red', 'blue',
    'green', 'brown', 'tan', 'beige', 'pink', 'yellow', 'orange', 'purple',
  ]
  for (const color of COLORS) {
    if (new RegExp(`\\b${color}\\b`, 'i').test(query)) {
      return color === 'gray' ? 'Grey' : color.charAt(0).toUpperCase() + color.slice(1)
    }
  }
  return null
}

export function findVariant(product, size, color) {
  if (!product.variants?.length) return null
  return product.variants.find(v =>
    (!size || String(v.size) === String(size)) &&
    (!color || v.color.toLowerCase() === color.toLowerCase()) &&
    v.inStock
  ) || null
}

export function buildProductsUrl(query, { gender, color, size, minPrice, maxPrice, sort } = {}) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (gender) params.set('gender', gender)
  if (color) params.set('color', color)
  if (size) params.set('size', size)
  if (minPrice) params.set('priceMin', String(minPrice))
  if (maxPrice) params.set('priceMax', String(maxPrice))
  if (sort) params.set('sort', sort)
  const qs = params.toString()
  return qs ? `/products?${qs}` : '/products'
}

async function loadProducts() {
  try {
    const keys = ['public:products:list:{}', 'public:products:list:{"storefront":true}']
    for (const key of keys) {
      const cached = await getCachedJson(key)
      if (cached?.items?.length) return cached.items
    }
    const { items } = await findAll({ storefront: true, limit: 1000, offset: 0 })
    return items || []
  } catch (err) {
    logger.warn({ err: err.message }, 'voice-search: failed to load products')
    return []
  }
}

export async function buildIndex() {
  try {
    const products = await loadProducts()
    if (!products.length) {
      logger.warn('voice-search: no products found, index not built')
      return
    }
    const documents = products.map(buildSearchDocument)
    fuseIndex = new Fuse(documents, FUSE_OPTIONS)
    productCache = documents
    lastBuilt = Date.now()
    logger.info({ count: products.length }, 'voice-search: Fuse index built successfully')
  } catch (err) {
    logger.error({ err: err.message }, 'voice-search: failed to build index')
  }
}

export async function rebuildIndex() {
  logger.info('voice-search: rebuilding Fuse index')
  await buildIndex()
}

export async function search(rawQuery) {
  if (!fuseIndex || Date.now() - lastBuilt > REBUILD_INTERVAL) {
    await buildIndex()
  }

  if (!fuseIndex) {
    return { type: 'error', message: 'Search is temporarily unavailable. Please try again.' }
  }

  const normalizedQuery = normalizeQuery(rawQuery)
  const priceIntent = extractPriceIntent(rawQuery)
  const gender = extractGender(rawQuery)
  const size = extractSize(rawQuery)
  const color = extractColor(rawQuery)

  let fuseQuery = normalizedQuery
    .replace(/between\s+\$?\d+\s+and\s+\$?\d+/gi, '')
    .replace(/(?:under|above|over)\s+\$?\d+/gi, '')
    .replace(/\b(cheap|cheapest|expensive|premium|affordable)\b/gi, '')
    .replace(/\bsize\s+\d+\b/gi, '')
    .replace(/\b(black|white|grey|gray|navy|red|blue|green|brown|tan|beige|pink|yellow|orange|purple)\b/gi, '')
    .replace(/\b(women|woman|female|ladies|men|male|guys|kids|children|unisex)\b/gi, '')
    .replace(/\b(for|in|the|a|an|i|want|need|looking|find|show|get|me|some|any)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  let results = fuseQuery
    ? fuseIndex.search(fuseQuery)
    : productCache.map(item => ({ item, score: 0 }))

  if (gender) {
    results = results.filter(r => r.item.gender === gender || r.item.gender === 'unisex')
  }
  if (priceIntent.maxPrice !== undefined) {
    results = results.filter(r => r.item.price <= priceIntent.maxPrice)
  }
  if (priceIntent.minPrice !== undefined) {
    results = results.filter(r => r.item.price >= priceIntent.minPrice)
  }
  if (color) {
    const colorFiltered = results.filter(r =>
      r.item.colorImages?.some(ci => ci.color.toLowerCase() === color.toLowerCase()) ||
      r.item.variants?.some(v => v.color.toLowerCase() === color.toLowerCase())
    )
    if (colorFiltered.length) results = colorFiltered
  }

  if (priceIntent.sort === 'price_asc') {
    results.sort((a, b) => a.item.price - b.item.price)
  } else if (priceIntent.sort === 'price_desc') {
    results.sort((a, b) => b.item.price - a.item.price)
  }

  if (!results.length) {
    return {
      type: 'not_found',
      message: `I couldn't find any shoes matching "${rawQuery}". Try searching by brand name, category like running or basketball, or a price range.`,
      query: rawQuery,
    }
  }

  const top = results[0]
  if (results.length === 1 || (top.score !== undefined && top.score < 0.05)) {
    return {
      type: 'exact',
      product: top.item,
      size,
      color,
      message: `Found ${top.item.name} by ${top.item.brand} for $${top.item.price}.${top.item.inStock ? ' It is in stock.' : ' Unfortunately it is out of stock.'}`,
    }
  }

  const topResults = results.slice(0, 12).map(r => r.item)
  const navigateTo = buildProductsUrl(fuseQuery, { gender, color, size, ...priceIntent })

  return {
    type: 'multiple',
    products: topResults,
    total: results.length,
    size,
    color,
    gender,
    priceIntent,
    navigateTo,
    message: `I found ${results.length} shoes matching your search. Showing the best matches on screen now.`,
  }
}
