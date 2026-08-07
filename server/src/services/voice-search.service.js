import Fuse from 'fuse.js'
import { getCachedJson } from './cache.service.js'
import { findAll } from '../models/product.model.js'
import { logger } from '../config/logger.js'

let fuseIndex = null
let productCache = []
let lastBuilt = 0
const REBUILD_INTERVAL = 5 * 60 * 1000

const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'could', 'do',
  'for', 'from', 'get', 'give', 'good', 'have', 'i', 'in', 'is', 'it', 'me',
  'my', 'need', 'of', 'on', 'or', 'our', 'pair', 'please', 'product', 'products',
  'shoe', 'shoes', 'show', 'some', 'tell', 'the', 'them', 'there', 'this', 'to',
  'us', 'want', 'what', 'which', 'who', 'with', 'would', 'you', 'your',
])

// ─── Distance & Similarity Algorithms ────────────────────────────────────────

export function levenshteinDistance(s1, s2) {
  const a = String(s1 || '').toLowerCase()
  const b = String(s2 || '').toLowerCase()
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const row = new Int32Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) row[j] = j

  for (let i = 1; i <= a.length; i++) {
    let prev = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const cur = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost)
      row[j - 1] = prev
      prev = cur
    }
    row[b.length] = prev
  }
  return row[b.length]
}

export function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0
  const a = String(s1).trim().toLowerCase()
  const b = String(s2).trim().toLowerCase()
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  const dist = levenshteinDistance(a, b)
  return Math.max(0, 1 - dist / maxLen)
}

// ─── Dynamic Catalogue Discovery (Zero Hardcoding) ───────────────────────────

export function getCatalogueBrands() {
  const brands = new Map()
  for (const p of productCache) {
    if (p.brand && typeof p.brand === 'string') {
      const trimmed = p.brand.trim()
      brands.set(trimmed.toLowerCase(), trimmed)
    }
  }
  return brands
}

export function getCatalogueCategories() {
  const categories = new Map()
  for (const p of productCache) {
    if (p.category) {
      const slug = (p.category.slug || (typeof p.category === 'string' ? p.category : '')).trim()
      const name = (p.category.name || (typeof p.category === 'string' ? p.category : '')).trim()
      if (slug) {
        categories.set(slug.toLowerCase(), { slug, name: name || slug })
      }
      if (name) {
        categories.set(name.toLowerCase(), { slug: slug || name.toLowerCase().replace(/\s+/g, '-'), name })
      }
    }
  }
  return categories
}

export function getCatalogueColors() {
  const colors = new Map()
  for (const p of productCache) {
    const list = [
      ...(Array.isArray(p.colors) ? p.colors : []),
      ...(Array.isArray(p.colorImages) ? p.colorImages.map(ci => ci?.color) : []),
      ...(Array.isArray(p.variants) ? p.variants.map(v => v?.color) : []),
    ]
    for (const c of list) {
      if (c && typeof c === 'string') {
        const trimmed = c.trim()
        colors.set(trimmed.toLowerCase(), trimmed)
      }
    }
  }
  return colors
}

export function getCatalogueMaterials() {
  const materials = new Map()
  for (const p of productCache) {
    if (p.material && typeof p.material === 'string') {
      const trimmed = p.material.trim()
      materials.set(trimmed.toLowerCase(), trimmed)
    }
  }
  return materials
}
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

// ─── Dynamic Entity Extractors ───────────────────────────────────────────────

export function extractBrand(rawText) {
  if (!rawText) return null
  const text = String(rawText).toLowerCase()
  const brands = getCatalogueBrands()

  for (const [lowerBrand, origBrand] of brands.entries()) {
    if (new RegExp(`\\b${lowerBrand.replace(/[^a-z0-9]/g, '[-\\s]?')}\\b`, 'i').test(text)) {
      return origBrand
    }
  }

  const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    for (const [lowerBrand, origBrand] of brands.entries()) {
      if (stringSimilarity(w, lowerBrand) >= 0.75) {
        return origBrand
      }
    }
  }
  return null
}

export function extractCategory(rawText) {
  if (!rawText) return null
  const text = String(rawText).toLowerCase()
  const categories = getCatalogueCategories()

  for (const [key, def] of categories.entries()) {
    if (new RegExp(`\\b${key.replace(/[^a-z0-9]/g, '[-\\s]?')}\\b`, 'i').test(text)) {
      return def
    }
  }

  const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    for (const [key, def] of categories.entries()) {
      if (stringSimilarity(w, def.slug.toLowerCase()) >= 0.75 || stringSimilarity(w, def.name.toLowerCase()) >= 0.75) {
        return def
      }
    }
  }
  return null
}

export function extractGender(rawText) {
  if (!rawText) return null
  const text = String(rawText).toLowerCase()
  if (/\b(women|woman|womens|women's|female|females|lady|ladies|girl|girls|wmn|wman|wmen|womans|womin)\b/i.test(text)) {
    return 'women'
  }
  if (/\b(men|man|mens|men's|male|males|guy|guys|boy|boys|gentleman|gentlemen|mn)\b/i.test(text)) {
    return 'men'
  }
  if (/\b(unisex|unisexual|unisexs|all\s+gender|all\s+genders|all-gender|gender\s+neutral|neutral|for\s+both|both\s+men\s+and\s+women|universal|everyone)\b/i.test(text)) {
    return 'unisex'
  }
  if (/\b(kids|kid|child|children|youth|toddler|junior|boys\s+and\s+girls)\b/i.test(text)) {
    return 'kids'
  }
  return null
}

export function extractColor(rawText) {
  if (!rawText) return null
  const text = String(rawText).toLowerCase()
  const colors = getCatalogueColors()

  for (const [lowerCol, origCol] of colors.entries()) {
    if (new RegExp(`\\b${lowerCol.replace(/[^a-z0-9]/g, '[-\\s]?')}\\b`, 'i').test(text)) {
      return origCol
    }
  }

  const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    for (const [lowerCol, origCol] of colors.entries()) {
      if (stringSimilarity(w, lowerCol) >= 0.75) {
        return origCol
      }
    }
  }

  // Fallback to common colour names so words absent from the catalogue are
  // still detected ("select green") — the availability check then rejects
  // them with the real options instead of silently ignoring the colour.
  const COMMON_COLORS = [
    'black', 'white', 'grey', 'gray', 'navy', 'red', 'blue', 'green',
    'brown', 'tan', 'beige', 'pink', 'yellow', 'orange', 'purple',
    'teal', 'olive', 'maroon', 'gold', 'silver', 'cream', 'coral',
  ]
  for (const c of COMMON_COLORS) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(text)) {
      return c
    }
  }
  return null
}

export function extractMaterial(rawText) {
  if (!rawText) return null
  const text = String(rawText).toLowerCase()
  const materials = getCatalogueMaterials()

  for (const [lowerMat, origMat] of materials.entries()) {
    if (new RegExp(`\\b${lowerMat.replace(/[^a-z0-9]/g, '[-\\s]?')}\\b`, 'i').test(text)) {
      return origMat
    }
  }

  const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    for (const [lowerMat, origMat] of materials.entries()) {
      if (stringSimilarity(w, lowerMat) >= 0.75) {
        return origMat
      }
    }
  }
}
export function extractSize(rawText) {
  if (!rawText) return null
  const match = String(rawText).match(/\b(?:size|eu|us)\s*:?\s*(\d+(?:\.\d+)?)\b/i) ||
                String(rawText).match(/\b(\d{2}(?:\.5)?)\s*(?:eu|size)\b/i)
  return match ? match[1] : null
}


export function extractPriceIntent(rawText) {
  if (!rawText) return {}
  const text = String(rawText).toLowerCase()

  const between = text.match(/(?:between|from)\s+\$?(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*\$?(\d+(?:\.\d+)?)/i) ||
                  text.match(/\$?(\d+)\s*(?:-|to)\s*\$?(\d+)/i)
  const under   = text.match(/(?:under|below|less\s+than|max|up\s+to|cheaper\s+than|within|<=?)\s+\$?(\d+(?:\.\d+)?)/i)
  const above   = text.match(/(?:above|over|more\s+than|greater\s+than|at\s+least|min|minimum|starting\s+from|>=?)\s+\$?(\d+(?:\.\d+)?)/i)
  const around  = text.match(/(?:around|about|approx|approximately)\s+\$?(\d+(?:\.\d+)?)/i)

  const cheapest = /\b(cheap|cheapest|affordable|budget|low\s+price|lowest\s+price|economy|discount|sale)\b/i.test(text)
  const priciest = /\b(expensive|priciest|premium|luxury|high\s+end|high-end|highest\s+price)\b/i.test(text)
  const newest   = /\b(new|newest|latest|recent|fresh|new\s+arrivals|just\s+dropped)\b/i.test(text)
  const popular  = /\b(popular|best\s+seller|best\s+selling|top\s+seller|trending|hot)\b/i.test(text)
  const rating   = /\b(top\s+rated|best\s+rated|highest\s+rating|best\s+reviews|5\s+star|rating)\b/i.test(text)

  const result = {}
  if (between) {
    result.minPrice = Number(between[1])
    result.maxPrice = Number(between[2])
  } else if (under) {
    result.maxPrice = Number(under[1])
  } else if (above) {
    result.minPrice = Number(above[1])
  } else if (around) {
    const val = Number(around[1])
    result.minPrice = Math.max(0, Math.round(val * 0.8))
    result.maxPrice = Math.round(val * 1.2)
  }

  if (cheapest)      result.sort = 'price_asc'
  else if (priciest) result.sort = 'price_desc'
  else if (newest)   result.sort = 'newest'
  else if (popular)  result.sort = 'popular'
  else if (rating)   result.sort = 'rating'

  return result
}

export function isSuggestionIntent(rawText) {
  if (!rawText) return true
  const text = String(rawText).toLowerCase()
  const patterns = [
    /\b(suggest|suggestion|suggestions|recommend|recommendation|recommendations)\b/i,
    /\b(show\s+me|show|browse|what\s+do\s+you\s+have|what\s+are|tell\s+me\s+about)\b/i,
    /\b(looking\s+for|find\s+me|find|search|give\s+me|list|options|any|some)\b/i,
    /\b(best\s+shoes|good\s+shoes|help\s+me\s+choose|what\s+should\s+i\s+buy)\b/i,
    /\b(shoes\s+for|sneakers\s+for|kicks\s+for|boots\s+for)\b/i,
  ]
}

export function isExplicitOpenIntent(rawText) {
  if (!rawText) return false
  const text = String(rawText).toLowerCase()
  return /\b(open|view|go\s+to|details\s+of|take\s+me\s+to|show\s+details|select)\b/i.test(text)
}

// ─── Specific Product Name Match (>= 80% Threshold) ──────────────────────────

/**
 * Calculates match similarity against a specific product's distinct model name.
 * Returns 0 if query is merely a brand or category name.
 */
export function calculateNameSimilarity(queryText, product) {
  if (!queryText || !product?.name) return 0
  const cleanQ = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const fullName = product.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const brand = (product.brand || '').toLowerCase().trim()

  // A brand name or generic category word alone is NOT a specific product model!
  if (cleanQ === brand || cleanQ.length < 3) return 0

  if (cleanQ === fullName) return 1.0

  const fullSim = stringSimilarity(cleanQ, fullName)

  // Model name without brand prefix (e.g. "Titan GT 198" from "Adidas Titan GT 198")
  const modelName = brand && fullName.startsWith(brand)
    ? fullName.slice(brand.length).trim()
    : fullName

  const modelSim = stringSimilarity(cleanQ, modelName)

  // Query without brand
  const qWithoutBrand = brand && cleanQ.includes(brand)
    ? cleanQ.replace(new RegExp(`\\b${brand}\\b`, 'gi'), '').replace(/\s+/g, ' ').trim()
    : cleanQ
  const strippedSim = qWithoutBrand.length >= 3 ? stringSimilarity(qWithoutBrand, modelName) : 0

  let substringScore = 0
  if (qWithoutBrand.length >= 4 && modelName.includes(qWithoutBrand)) {
    substringScore = Math.min(0.95, qWithoutBrand.length / modelName.length + 0.35)
  }

  const qTokens = cleanQ.split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t) && t !== brand)
  const targetTokens = modelName.split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t))

  let matchedTokens = 0
  let tokenWeightSum = 0
  for (const qt of qTokens) {
    let best = 0
    for (const tt of targetTokens) {
      const sim = stringSimilarity(qt, tt)
      if (sim > best) best = sim
    }
    if (best >= 0.75) {
      matchedTokens += 1
      tokenWeightSum += best
    }
  }

  const tokenCoverage = qTokens.length > 0 ? (matchedTokens / qTokens.length) : 0
  const tokenAvg = qTokens.length > 0 ? (tokenWeightSum / qTokens.length) : 0
  const tokenScore = tokenCoverage >= 0.8 ? tokenAvg : tokenCoverage * 0.75

  return Math.max(fullSim, modelSim, strippedSim, substringScore, tokenScore)
}

// ─── Document Builder & Indexing ─────────────────────────────────────────────

function buildSearchDocument(product) {
  const colorList = product.colors || []
  const tagsList = product.tags || []
  const catName = product.category?.name || (typeof product.category === 'string' ? product.category : '')
  const catSlug = product.category?.slug || ''

  const tokens = [
    product.name,
    product.brand,
    product.description,
    catName,
    catSlug,
    product.material,
    product.gender,
    ...colorList,
    ...tagsList,
  ].filter(Boolean).join(' ').toLowerCase()

  return {
    ...product,
    _searchText: tokens,
    _normalizedName: (product.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(),
  }
}

export function findVariant(product, size, color) {
  if (!product?.variants?.length) return null
  return product.variants.find(v =>
    (!size  || String(v.size) === String(size)) &&
    (!size || String(v.size) === String(size)) &&
    (!color || v.color.toLowerCase() === color.toLowerCase()) &&
    v.inStock
  ) || null
}

export function buildProductsUrl(query, { gender, color, size, category, minPrice, maxPrice, sort } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (gender)   params.set('gender', gender)
  if (color)    params.set('color', color)
  if (size)     params.set('size', String(size))
  if (minPrice !== undefined && minPrice !== null) params.set('priceMin', String(minPrice))
  if (maxPrice !== undefined && maxPrice !== null) params.set('priceMax', String(maxPrice))
  if (sort && sort !== 'trending') params.set('sort', sort)
  if (query && query.trim()) params.set('q', query.trim())
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
    lastBuilt    = Date.now()
    logger.info({ count: products.length }, 'voice-search: dynamic index built successfully')
    lastBuilt = Date.now()
    logger.info({ count: products.length }, 'voice-search: Fuse index built successfully')
  } catch (err) {
    logger.error({ err: err.message }, 'voice-search: failed to build index')
  }
}

export async function rebuildIndex() {
  logger.info('voice-search: rebuilding dynamic index')
  await buildIndex()
}

// ─── Main Dynamic Search & Suggestion Engine ─────────────────────────────────

export async function search(input) {
  if (!fuseIndex || Date.now() - lastBuilt > REBUILD_INTERVAL) {
    await buildIndex()
  }

  if (!fuseIndex || !productCache.length) {
    return { type: 'error', message: 'Search is temporarily unavailable. Please try again.' }
  }
  let rawQuery = ''
  let explicitBrand = null
  let explicitCategory = null
  let explicitGender = null
  let explicitColor = null
  let explicitSize = null
  let explicitMaterial = null
  let explicitMinPrice = null
  let explicitMaxPrice = null
  let explicitSort = null

  if (typeof input === 'string') {
    rawQuery = input
  } else if (input && typeof input === 'object') {
    rawQuery          = input.query || input.q || input.search || input.text || ''
    explicitBrand     = input.brand || null
    explicitCategory  = input.category || null
    explicitGender    = input.gender || null
    explicitColor     = input.color || null
    explicitSize      = input.size || null
    explicitMaterial  = input.material || null
    explicitMinPrice  = input.min_price ?? input.price_min ?? input.minPrice ?? null
    explicitMaxPrice  = input.max_price ?? input.price_max ?? input.maxPrice ?? null
    explicitSort      = input.sort || null

    if (input.price_range && typeof input.price_range === 'string') {
      const parsedRange = extractPriceIntent(input.price_range)
      if (parsedRange.minPrice) explicitMinPrice = parsedRange.minPrice
      if (parsedRange.maxPrice) explicitMaxPrice = parsedRange.maxPrice
      if (parsedRange.sort)     explicitSort     = parsedRange.sort
    }
  }

  const combinedText = [rawQuery, explicitBrand, explicitCategory, explicitGender, explicitColor, explicitMaterial]
    .filter(Boolean).join(' ')

  // 1. Extract structured filters FIRST
  const brandName     = explicitBrand || extractBrand(combinedText)
  const categoryDef   = explicitCategory
    ? (getCatalogueCategories().get(explicitCategory.toLowerCase()) || { slug: explicitCategory.toLowerCase().replace(/\s+/g, '-'), name: explicitCategory })
    : extractCategory(combinedText)
  const gender        = explicitGender ? extractGender(explicitGender) : extractGender(combinedText)
  const color         = explicitColor ? (getCatalogueColors().get(explicitColor.toLowerCase()) || explicitColor) : extractColor(combinedText)
  const size          = explicitSize || extractSize(combinedText)
  const material      = explicitMaterial ? (getCatalogueMaterials().get(explicitMaterial.toLowerCase()) || explicitMaterial) : extractMaterial(combinedText)
  const priceIntent   = extractPriceIntent(combinedText)

  const minPrice = explicitMinPrice !== null ? Number(explicitMinPrice) : priceIntent.minPrice
  const maxPrice = explicitMaxPrice !== null ? Number(explicitMaxPrice) : priceIntent.maxPrice
  const sort     = explicitSort || priceIntent.sort || null

  const isSuggestion = isSuggestionIntent(rawQuery)
  const isExplicitOpen = isExplicitOpenIntent(rawQuery)

  // 2. Clean query of consumed filter tokens and stop words to find residual search keywords
  const rawWords = (rawQuery || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const residualWords = []

  for (const w of rawWords) {
    if (STOP_WORDS.has(w)) continue
    if (w === 'best' || w === 'top' || w === 'cheap' || w === 'cheapest' || w === 'expensive' || w === 'newest') continue
    if (gender && (w === gender || w === `${gender}s` || (gender === 'men' && (w === 'man' || w === 'male' || w === 'guys')) || (gender === 'women' && (w === 'woman' || w === 'female' || w === 'ladies')) || (gender === 'unisex' && (w === 'unisexual' || w === 'universal')))) continue
    if (categoryDef && (w === categoryDef.slug || w === categoryDef.name.toLowerCase() || (categoryDef.slug === 'running' && (w === 'running' || w === 'runing' || w === 'runner')) || (categoryDef.slug === 'sneakers' && (w === 'sneakers' || w === 'sneaker' || w === 'snickers' || w === 'kicks')) || (categoryDef.slug === 'formal' && (w === 'formal' || w === 'formel' || w === 'dress')) || (categoryDef.slug === 'boots' && (w === 'boots' || w === 'boot')) || (categoryDef.slug === 'basketball' && (w === 'basketball' || w === 'basktball' || w === 'bball')))) continue
    if (color && (w === color.toLowerCase() || (color === 'Black' && (w === 'black' || w === 'blak')) || (color === 'White' && (w === 'white' || w === 'wite')))) continue
    if (material && (w === material.toLowerCase() || (material === 'Genuine Leather' && (w === 'leather' || w === 'lether')) || (material === 'Suede' && (w === 'suede' || w === 'swede')) || (material === 'Canvas' && (w === 'canvas' || w === 'canvs')) || (material === 'Knit Upper' && (w === 'knit' || w === 'knitted')))) continue
    if (brandName && stringSimilarity(w, brandName.toLowerCase()) >= 0.75) {
      continue
    }
    residualWords.push(w)
  }

  const cleanedTextQuery = residualWords.join(' ').trim()
  const modelKeywords = residualWords.filter(t => t.length > 1 && !STOP_WORDS.has(t))

  // 3. Initial Candidate Filtering
  let candidatePool = [...productCache]

  if (gender) {
    candidatePool = candidatePool.filter(p => p.gender === gender || p.gender === 'unisex')
  }
  if (brandName) {
    const bLower = brandName.toLowerCase()
    const brandMatches = candidatePool.filter(p => stringSimilarity(p.brand, bLower) >= 0.75)
    if (brandMatches.length) candidatePool = brandMatches
  }
  if (categoryDef?.slug) {
    const catSlugLower = categoryDef.slug.toLowerCase()
    const catNameLower = (categoryDef.name || '').toLowerCase()
    const catMatches = candidatePool.filter(p => {
      const pCatSlug = (p.category?.slug || (typeof p.category === 'string' ? p.category : '')).toLowerCase()
      const pCatName = (p.category?.name || (typeof p.category === 'string' ? p.category : '')).toLowerCase()
      return pCatSlug === catSlugLower || stringSimilarity(pCatName, catNameLower) >= 0.75
    })
    if (catMatches.length) candidatePool = catMatches
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    candidatePool = candidatePool.filter(p => p.price <= maxPrice)
  }
  if (minPrice !== undefined && minPrice !== null) {
    candidatePool = candidatePool.filter(p => p.price >= minPrice)
  }
  if (color) {
    const colorMatches = candidatePool.filter(p =>
      p.colors?.some(c => stringSimilarity(c, color) >= 0.80) ||
      p.colorImages?.some(ci => stringSimilarity(ci.color, color) >= 0.80) ||
      p.variants?.some(v => stringSimilarity(v.color, color) >= 0.80)
    )
    if (colorMatches.length) candidatePool = colorMatches
  }
  if (material) {
    const matMatches = candidatePool.filter(p => stringSimilarity(p.material || '', material) >= 0.75)
    if (matMatches.length) candidatePool = matMatches
  }

  // 4. Simple Search on residual words across candidate pool
  let scoredResults = []
  if (cleanedTextQuery.length >= 2) {
    const tempFuse = new Fuse(candidatePool, FUSE_OPTIONS)
    const fuseMatches = tempFuse.search(cleanedTextQuery)
    scoredResults = fuseMatches.map(m => ({ item: m.item, fuseScore: m.score }))
    const matchedIds = new Set(scoredResults.map(r => r.item.id))
    for (const item of candidatePool) {
      if (!matchedIds.has(item.id)) {
        scoredResults.push({ item, fuseScore: 0.9 })
      }
    }
  } else {
    scoredResults = candidatePool.map(item => ({ item, fuseScore: 0.5 }))
  }

  // 5. Scoring & Rank
  const scoredItems = scoredResults.map(({ item, fuseScore }) => {
    const nameMatchScore = calculateNameSimilarity(cleanedTextQuery || rawQuery, item)
    const relevanceScore = (nameMatchScore * 0.60) + ((1 - (fuseScore ?? 0.5)) * 0.40)
    return {
      item,
      nameMatchScore,
      relevanceScore,
    }
  })

  // Apply sorting
  if (sort === 'price_asc') {
    scoredItems.sort((a, b) => a.item.price - b.item.price)
  } else if (sort === 'price_desc') {
    scoredItems.sort((a, b) => b.item.price - a.item.price)
  } else if (sort === 'newest') {
    scoredItems.sort((a, b) => (b.item.featured ? 1 : 0) - (a.item.featured ? 1 : 0))
  } else if (sort === 'popular') {
    scoredItems.sort((a, b) => (b.item.unitsSold || 0) - (a.item.unitsSold || 0))
  } else if (sort === 'rating') {
    scoredItems.sort((a, b) => (b.item.rating || 0) - (a.item.rating || 0))
  } else {
    scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  if (!scoredItems.length) {
    const friendlyCategory = categoryDef?.name || 'shoes'
    const friendlyGender = gender ? (gender === 'unisex' ? 'unisex' : `${gender}'s`) : ''
    return {
      type: 'not_found',
      message: `I couldn't find any ${friendlyGender} ${friendlyCategory} matching your search. I've updated your screen with our full collection so you can browse.`,
      navigateTo: buildProductsUrl(brandName || null, { category: categoryDef?.slug, gender, color, sort }),
      query: rawQuery,
    }
  }

  const top = scoredItems[0]

  // 6. Exact Navigation Decision (Only on distinct shoe model name >= 80%, NEVER on general brand/category)
  const hasDistinctModelName = modelKeywords.length > 0 && cleanedTextQuery.length >= 3
  const isNameMatch80 = hasDistinctModelName && top.nameMatchScore >= 0.80
  const shouldOpenDirectly = !isSuggestion && (isNameMatch80 || isExplicitOpen)

  if (shouldOpenDirectly) {
    const product = top.item
    const stockMsg = product.inStock ? 'It is currently in stock.' : 'Note: currently out of stock.'
    return {
      type: 'exact',
      product,
      size,
      color,
      nameMatchScore: Math.round(top.nameMatchScore * 100),
      message: `I've opened the ${product.name} by ${product.brand} for $${Number(product.price).toFixed(2)} on your screen. ${stockMsg} Would you like to select a size or add it to your cart?`,
    }
  }

  // 7. Product List Navigation (Construct clean URL with structured filters + residual query)
  const topResults = scoredItems.slice(0, 12).map(r => r.item)
  const residualQuery = (cleanedTextQuery && cleanedTextQuery.length >= 2)
    ? cleanedTextQuery
    : (brandName || null)

  const navigateTo = buildProductsUrl(
    residualQuery,
    {
      category: categoryDef?.slug,
      gender,
      color,
      size,
      minPrice,
      maxPrice,
      sort,
    }
  )

  const resultCount = scoredItems.length
  const rawCat = categoryDef ? categoryDef.name.toLowerCase() : 'shoes'
  const catLabel = rawCat.includes('shoe') || rawCat.includes('boot') || rawCat.includes('sneaker') ? rawCat : `${rawCat} shoes`
  const brandLabel = brandName ? `${brandName} ` : ''
  const genderLabel = gender ? (gender === 'unisex' ? 'unisex ' : `${gender}'s `) : ''
  const colorLabel = color ? `${color} ` : ''
  const priceLabel = maxPrice ? ` under $${maxPrice}` : (minPrice ? ` over $${minPrice}` : '')

  const message = `I found some ${colorLabel}${genderLabel}${brandLabel}${catLabel}${priceLabel} matching your request. You can see all of them on your screen right now. Let me know if you'd like to filter further or choose a specific pair!`
  const toastMessage = `Showing ${resultCount} ${colorLabel}${genderLabel}${brandLabel}${catLabel} on screen`

  return {
    type: 'multiple',
    products: topResults,
    total: resultCount,
    size,
    color,
    gender,
    category: categoryDef?.name || null,
    categorySlug: categoryDef?.slug || null,
    brand: brandName || null,
    priceIntent: { minPrice, maxPrice, sort },
    navigateTo,
    message,
    toastMessage,
  }
}
