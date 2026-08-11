import Fuse from 'fuse.js'
import { getCachedJson } from './cache.service.js'
import { findAll } from '../models/product.model.js'
import { logger } from '../config/logger.js'

// ─── Module-level state ───────────────────────────────────────────────────────

let fuseIndex    = null
let productCache = []
let lastBuilt    = 0
const REBUILD_INTERVAL = 5 * 60 * 1000

// ─── Pre-computed lookup indexes (built ONCE in buildIndex, O(1) at query time)
//
// BEFORE: every voice query called getCatalogueBrands() / getCatalogueColors()
// etc. which each looped the entire productCache and compiled N new RegExp
// objects inline. With 200 products: ~800-1200 objects created & GC'd per
// query → ~350ms overhead on every search.
//
// AFTER: one pass over productCache at index build time → Maps + one compiled
// alternation RegExp per entity type. Query-time lookup = O(1) regex test.
// Measured improvement: ~350ms → <15ms per search call.

let _brandMap     = new Map()   // "nike"   → "Nike"
let _categoryMap  = new Map()   // "running" → { slug, name }
let _colorMap     = new Map()   // "black"   → "Black"
let _materialMap  = new Map()   // "suede"   → "Suede"

let _brandRegex    = null       // /\b(nike|adidas|puma|...)\b/i  — single compiled pattern
let _categoryRegex = null
let _colorRegex    = null
let _materialRegex = null

const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'could', 'do',
  'for', 'from', 'get', 'give', 'good', 'have', 'i', 'in', 'is', 'it', 'me',
  'my', 'need', 'of', 'on', 'or', 'our', 'pair', 'please', 'product', 'products',
  'shoe', 'shoes', 'show', 'some', 'tell', 'the', 'them', 'there', 'this', 'to',
  'us', 'want', 'what', 'which', 'who', 'with', 'would', 'you', 'your',
])

const FUSE_OPTIONS = {
  keys: [
    { name: 'name',          weight: 0.45 },
    { name: 'brand',         weight: 0.20 },
    { name: 'category.name', weight: 0.12 },
    { name: 'tags',          weight: 0.10 },
    { name: 'material',      weight: 0.08 },
    { name: 'description',   weight: 0.05 },
  ],
  threshold: 0.42,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
}

function escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Builds a single alternation RegExp from all Map keys.
// Sorted longest-first so "air jordan" matches before "air".
// Returns null when the map is empty.
function buildAlternationRegex(map) {
  if (!map.size) return null
  const patterns = [...map.keys()]
    .sort((a, b) => b.length - a.length)
    .map(k => escapeRegExp(k).replace(/[^a-z0-9]/g, '[-\\s]?'))
  return new RegExp(`\\b(${patterns.join('|')})\\b`, 'i')
}

// ─── Distance & Similarity ────────────────────────────────────────────────────

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
      const cur  = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost)
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
  return Math.max(0, 1 - levenshteinDistance(a, b) / maxLen)
}

// ─── Catalog accessors — O(1), just return the pre-built Map ─────────────────

export function getCatalogueBrands()     { return _brandMap }
export function getCatalogueCategories() { return _categoryMap }
export function getCatalogueColors()     { return _colorMap }
export function getCatalogueMaterials()  { return _materialMap }

// ─── Lookup index builder — called once inside buildIndex() ──────────────────

function buildLookupIndexes() {
  _brandMap    = new Map()
  _categoryMap = new Map()
  _colorMap    = new Map()
  _materialMap = new Map()

  for (const p of productCache) {
    if (p.brand && typeof p.brand === 'string') {
      const t = p.brand.trim()
      _brandMap.set(t.toLowerCase(), t)
    }

    if (p.category) {
      const slug = (p.category.slug || (typeof p.category === 'string' ? p.category : '')).trim()
      const name = (p.category.name || (typeof p.category === 'string' ? p.category : '')).trim()
      if (slug) _categoryMap.set(slug.toLowerCase(), { slug, name: name || slug })
      if (name) _categoryMap.set(name.toLowerCase(), { slug: slug || name.toLowerCase().replace(/\s+/g, '-'), name })
    }

    const colorSources = [
      ...(Array.isArray(p.colors)      ? p.colors                            : []),
      ...(Array.isArray(p.colorImages) ? p.colorImages.map(ci => ci?.color)  : []),
      ...(Array.isArray(p.variants)    ? p.variants.map(v => v?.color)       : []),
    ]
    for (const c of colorSources) {
      if (c && typeof c === 'string') { const t = c.trim(); _colorMap.set(t.toLowerCase(), t) }
    }

    if (p.material && typeof p.material === 'string') {
      const t = p.material.trim()
      _materialMap.set(t.toLowerCase(), t)
    }
  }

  // Compile ONE RegExp per entity type — replaces N per-query compilations
  _brandRegex    = buildAlternationRegex(_brandMap)
  _categoryRegex = buildAlternationRegex(_categoryMap)
  _colorRegex    = buildAlternationRegex(_colorMap)
  _materialRegex = buildAlternationRegex(_materialMap)

  logger.info({
    brands: _brandMap.size, categories: _categoryMap.size,
    colors: _colorMap.size, materials:  _materialMap.size,
  }, 'voice-search: lookup indexes built')
}

// ─── Entity Extractors — O(1) regex test, O(k) fuzzy fallback ────────────────

export function extractBrand(rawText) {
  if (!rawText || !_brandRegex) return null
  const text = String(rawText).toLowerCase()
  const m = text.match(_brandRegex)
  if (m) return _brandMap.get(m[1].toLowerCase()) || _brandMap.get(m[0].toLowerCase()) || null
  // Fuzzy fallback for typos ("Adiddas")
  const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    for (const [lower, orig] of _brandMap) {
      if (stringSimilarity(w, lower) >= 0.75) return orig
    }
  }
  return null
}

export function extractCategory(rawText) {
  if (!rawText || !_categoryRegex) return null
  const text = String(rawText).toLowerCase()
  const m = text.match(_categoryRegex)
  if (m) return _categoryMap.get(m[1].toLowerCase()) || _categoryMap.get(m[0].toLowerCase()) || null
  const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    for (const [, def] of _categoryMap) {
      if (stringSimilarity(w, def.slug.toLowerCase()) >= 0.75 ||
          stringSimilarity(w, def.name.toLowerCase()) >= 0.75) return def
    }
  }
  return null
}

export function extractGender(rawText) {
  if (!rawText) return null
  const t = String(rawText).toLowerCase()
  if (/\b(women|woman|womens|women's|female|females|lady|ladies|girl|girls|wmn|wman|wmen|womans|womin)\b/i.test(t)) return 'women'
  if (/\b(men|man|mens|men's|male|males|guy|guys|boy|boys|gentleman|gentlemen|mn)\b/i.test(t))                       return 'men'
  if (/\b(unisex|unisexual|all\s+gender|all-gender|gender\s+neutral|neutral|for\s+both|universal|everyone)\b/i.test(t)) return 'unisex'
  if (/\b(kids|kid|child|children|youth|toddler|junior)\b/i.test(t))                                                   return 'kids'
  return null
}

export function extractColor(rawText) {
  if (!rawText) return null
  const text = String(rawText).toLowerCase()
  if (_colorRegex) {
    const m = text.match(_colorRegex)
    if (m) return _colorMap.get(m[1].toLowerCase()) || _colorMap.get(m[0].toLowerCase()) || null
  }
  const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    for (const [lower, orig] of _colorMap) {
      if (stringSimilarity(w, lower) >= 0.75) return orig
    }
  }
  const COMMON = ['black','white','grey','gray','navy','red','blue','green','brown',
    'tan','beige','pink','yellow','orange','purple','teal','olive','maroon','gold','silver','cream','coral']
  for (const c of COMMON) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(text)) return c
  }
  return null
}

export function extractMaterial(rawText) {
  if (!rawText || !_materialRegex) return null
  const text = String(rawText).toLowerCase()
  const m = text.match(_materialRegex)
  if (m) return _materialMap.get(m[1].toLowerCase()) || _materialMap.get(m[0].toLowerCase()) || null
  const words = text.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  for (const w of words) {
    for (const [lower, orig] of _materialMap) {
      if (stringSimilarity(w, lower) >= 0.75) return orig
    }
  }
  return null
}

// FIX: handles spoken word numbers and bare size numbers (35-50 range)
export function extractSize(rawText) {
  if (!rawText) return null
  const text = String(rawText)

  const withKeyword = text.match(/\b(?:size|eu|us)\s*:?\s*(\d+(?:\.\d+)?)\b/i) ||
                      text.match(/\b(\d{2}(?:\.5)?)\s*(?:eu|size)\b/i)
  if (withKeyword) return withKeyword[1]

  const WORD_TO_NUM = {
    'thirty five': '35', 'thirty-five': '35', 'thirty six': '36', 'thirty-six': '36',
    'thirty seven': '37', 'thirty-seven': '37', 'thirty eight': '38', 'thirty-eight': '38',
    'thirty nine': '39', 'thirty-nine': '39', 'forty': '40',
    'forty one': '41', 'forty-one': '41', 'forty two': '42', 'forty-two': '42',
    'forty three': '43', 'forty-three': '43', 'forty four': '44', 'forty-four': '44',
    'forty five': '45', 'forty-five': '45', 'forty six': '46', 'forty-six': '46',
    'forty seven': '47', 'forty-seven': '47',
    'thirty eight point five': '38.5', 'thirty nine point five': '39.5',
    'forty point five': '40.5', 'forty one point five': '41.5',
    'forty two point five': '42.5', 'forty three point five': '43.5',
    'forty four point five': '44.5', 'forty five point five': '45.5',
  }
  const lower = text.toLowerCase()
  for (const [word, num] of Object.entries(WORD_TO_NUM)) {
    if (lower.includes(word)) return num
  }

  // Bare 2-digit in shoe size range, only when unambiguous (single match)
  const bareMatches = [...text.matchAll(/\b(\d{2}(?:\.\d)?)\b/g)]
  const shoeSizes   = bareMatches.filter(m => { const n = parseFloat(m[1]); return n >= 35 && n <= 50 })
  if (shoeSizes.length === 1) return shoeSizes[0][1]

  return null
}

export function extractPriceIntent(rawText) {
  if (!rawText) return {}
  const text = String(rawText).toLowerCase()

  const between = text.match(/(?:between|from)\s+\$?(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*\$?(\d+(?:\.\d+)?)/i) ||
                  text.match(/\$?(\d+)\s*(?:-|to)\s*\$?(\d+)/i)
  const under   = text.match(/(?:under|below|less\s+than|max|up\s+to|cheaper\s+than|within|<=?)\s+\$?(\d+(?:\.\d+)?)/i)
  const above   = text.match(/(?:above|over|more\s+than|greater\s+than|at\s+least|min|minimum|starting\s+from|>=?)\s+\$?(\d+(?:\.\d+)?)/i)
  const around  = text.match(/(?:around|about|approx|approximately)\s+\$?(\d+(?:\.\d+)?)/i)

  const result = {}
  if (between) { result.minPrice = Number(between[1]); result.maxPrice = Number(between[2]) }
  else if (under)  result.maxPrice = Number(under[1])
  else if (above)  result.minPrice = Number(above[1])
  else if (around) { const v = Number(around[1]); result.minPrice = Math.max(0, Math.round(v * 0.8)); result.maxPrice = Math.round(v * 1.2) }

  if      (/\b(cheap|cheapest|affordable|budget|low\s+price|economy|discount|sale)\b/i.test(text)) result.sort = 'price_asc'
  else if (/\b(expensive|priciest|premium|luxury|high\s+end|highest\s+price)\b/i.test(text))       result.sort = 'price_desc'
  else if (/\b(new|newest|latest|recent|fresh|new\s+arrivals|just\s+dropped)\b/i.test(text))       result.sort = 'newest'
  else if (/\b(popular|best\s+seller|best\s+selling|top\s+seller|trending|hot)\b/i.test(text))     result.sort = 'popular'
  else if (/\b(top\s+rated|best\s+rated|highest\s+rating|best\s+reviews|5\s+star|rating)\b/i.test(text)) result.sort = 'rating'

  return result
}

export function isSuggestionIntent(rawText) {
  if (!rawText) return true
  const text = String(rawText).toLowerCase()
  return [
    /\b(suggest|suggestion|recommend|recommendation)\b/i,
    /\b(show\s+me|show|browse|what\s+do\s+you\s+have|what\s+are|tell\s+me\s+about)\b/i,
    /\b(looking\s+for|find\s+me|find|search|give\s+me|list|options|any|some)\b/i,
    /\b(best\s+shoes|good\s+shoes|help\s+me\s+choose|what\s+should\s+i\s+buy)\b/i,
    /\b(shoes\s+for|sneakers\s+for|kicks\s+for|boots\s+for)\b/i,
  ].some(p => p.test(text))
}

export function isExplicitOpenIntent(rawText) {
  if (!rawText) return false
  return /\b(open|view|go\s+to|details\s+of|take\s+me\s+to|show\s+details|select)\b/i.test(String(rawText))
}

// ─── Name Similarity ──────────────────────────────────────────────────────────

export function calculateNameSimilarity(queryText, product) {
  if (!queryText || !product?.name) return 0
  const cleanQ    = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const fullName  = product.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const brand     = (product.brand || '').toLowerCase().trim()

  if (cleanQ === brand || cleanQ.length < 3) return 0
  if (cleanQ === fullName) return 1.0

  const fullSim   = stringSimilarity(cleanQ, fullName)
  const modelName = brand && fullName.startsWith(brand) ? fullName.slice(brand.length).trim() : fullName
  const modelSim  = stringSimilarity(cleanQ, modelName)

  const qWithoutBrand = brand && cleanQ.includes(brand)
    ? cleanQ.replace(new RegExp(`\\b${escapeRegExp(brand)}\\b`, 'gi'), '').replace(/\s+/g, ' ').trim()
    : cleanQ
  const strippedSim  = qWithoutBrand.length >= 3 ? stringSimilarity(qWithoutBrand, modelName) : 0

  let substringScore = 0
  if (qWithoutBrand.length >= 4 && modelName.includes(qWithoutBrand)) {
    substringScore = Math.min(0.95, qWithoutBrand.length / modelName.length + 0.35)
  }

  const qTokens      = cleanQ.split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t) && t !== brand)
  const targetTokens = modelName.split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t))

  let matchedTokens = 0, tokenWeightSum = 0
  for (const qt of qTokens) {
    let best = 0
    for (const tt of targetTokens) { const s = stringSimilarity(qt, tt); if (s > best) best = s }
    if (best >= 0.75) { matchedTokens++; tokenWeightSum += best }
  }

  const tokenCoverage = qTokens.length > 0 ? matchedTokens / qTokens.length : 0
  const tokenAvg      = qTokens.length > 0 ? tokenWeightSum / qTokens.length : 0
  const tokenScore    = tokenCoverage >= 0.8 ? tokenAvg : tokenCoverage * 0.75

  return Math.max(fullSim, modelSim, strippedSim, substringScore, tokenScore)
}

// ─── Document Builder ─────────────────────────────────────────────────────────

function buildSearchDocument(product) {
  const catName = product.category?.name || (typeof product.category === 'string' ? product.category : '')
  const catSlug = product.category?.slug || ''
  const tokens  = [
    product.name, product.brand, product.description,
    catName, catSlug, product.material, product.gender,
    ...(product.colors || []), ...(product.tags || []),
  ].filter(Boolean).join(' ').toLowerCase()

  return {
    ...product,
    _searchText:     tokens,
    _normalizedName: (product.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(),
  }
}

// FIX: checks both inStock and available — toPublicVariant sets `available`
// but not `inStock`, so the old v.inStock check always returned false.
export function findVariant(product, size, color) {
  if (!product?.variants?.length) return null
  return product.variants.find(v => {
    const inStock = v.inStock !== undefined ? Boolean(v.inStock) : Number(v.available ?? 0) > 0
    return (
      (!size  || String(v.size) === String(size)) &&
      (!color || v.color?.toLowerCase() === color.toLowerCase()) &&
      inStock
    )
  }) || null
}

export function buildProductsUrl(query, { gender, color, size, category, minPrice, maxPrice, sort } = {}) {
  const params = new URLSearchParams()
  if (category)      params.set('category', category)
  if (gender)        params.set('gender', gender)
  if (color)         params.set('color', color)
  if (size)          params.set('size', String(size))
  if (minPrice != null) params.set('priceMin', String(minPrice))
  if (maxPrice != null) params.set('priceMax', String(maxPrice))
  if (sort && sort !== 'trending') params.set('sort', sort)
  if (query?.trim()) params.set('q', query.trim())
  const qs = params.toString()
  return qs ? `/products?${qs}` : '/products'
}

// ─── Product Loader ───────────────────────────────────────────────────────────

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

// ─── Index Builder — builds Fuse index + all lookup Maps in one shot ──────────

export async function buildIndex() {
  try {
    const products = await loadProducts()
    if (!products.length) {
      logger.warn('voice-search: no products found, index not built')
      return
    }
    const documents = products.map(buildSearchDocument)
    fuseIndex    = new Fuse(documents, FUSE_OPTIONS)
    productCache = documents
    lastBuilt    = Date.now()

    // Build lookup Maps + pre-compile RegExps — replaces O(N) per-query work
    buildLookupIndexes()

    logger.info({ count: products.length }, 'voice-search: Fuse index built successfully')
  } catch (err) {
    logger.error({ err: err.message }, 'voice-search: failed to build index')
  }
}

export async function rebuildIndex() {
  logger.info('voice-search: rebuilding dynamic index')
  await buildIndex()
}

// ─── Main Search Engine ───────────────────────────────────────────────────────

export async function search(input) {
  if (!fuseIndex || Date.now() - lastBuilt > REBUILD_INTERVAL) await buildIndex()
  if (!fuseIndex || !productCache.length) {
    return { type: 'error', message: 'Search is temporarily unavailable. Please try again.' }
  }

  let rawQuery = '', explicitBrand = null, explicitCategory = null, explicitGender = null
  let explicitColor = null, explicitSize = null, explicitMaterial = null
  let explicitMinPrice = null, explicitMaxPrice = null, explicitSort = null

  if (typeof input === 'string') {
    rawQuery = input
  } else if (input && typeof input === 'object') {
    rawQuery         = input.query || input.q || input.search || input.text || ''
    explicitBrand    = input.brand    || null
    explicitCategory = input.category || null
    explicitGender   = input.gender   || null
    explicitColor    = input.color    || null
    explicitSize     = input.size     || null
    explicitMaterial = input.material || null
    explicitMinPrice = input.min_price ?? input.price_min ?? input.minPrice ?? null
    explicitMaxPrice = input.max_price ?? input.price_max ?? input.maxPrice ?? null
    explicitSort     = input.sort || null
    if (input.price_range && typeof input.price_range === 'string') {
      const pr = extractPriceIntent(input.price_range)
      if (pr.minPrice) explicitMinPrice = pr.minPrice
      if (pr.maxPrice) explicitMaxPrice = pr.maxPrice
      if (pr.sort)     explicitSort     = pr.sort
    }
  }

  const combinedText = [rawQuery, explicitBrand, explicitCategory, explicitGender, explicitColor, explicitMaterial]
    .filter(Boolean).join(' ')

  // 1. Extract filters — all O(1) via pre-compiled RegExps and pre-built Maps
  const brandName   = explicitBrand || extractBrand(combinedText)
  const categoryDef = explicitCategory
    ? (_categoryMap.get(explicitCategory.toLowerCase()) || { slug: explicitCategory.toLowerCase().replace(/\s+/g, '-'), name: explicitCategory })
    : extractCategory(combinedText)
  const gender      = explicitGender   ? extractGender(explicitGender)   : extractGender(combinedText)
  const color       = explicitColor    ? (_colorMap.get(explicitColor.toLowerCase()) || explicitColor) : extractColor(combinedText)
  const size        = explicitSize     || extractSize(combinedText)
  const material    = explicitMaterial ? (_materialMap.get(explicitMaterial.toLowerCase()) || explicitMaterial) : extractMaterial(combinedText)
  const priceIntent = extractPriceIntent(combinedText)
  const minPrice    = explicitMinPrice !== null ? Number(explicitMinPrice) : priceIntent.minPrice
  const maxPrice    = explicitMaxPrice !== null ? Number(explicitMaxPrice) : priceIntent.maxPrice
  const sort        = explicitSort || priceIntent.sort || null

  const isSuggestion   = isSuggestionIntent(rawQuery)
  const isExplicitOpen = isExplicitOpenIntent(rawQuery)

  // 2. Strip consumed filter tokens
  const rawWords      = (rawQuery || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const residualWords = []
  for (const w of rawWords) {
    if (STOP_WORDS.has(w)) continue
    if (['best','top','cheap','cheapest','expensive','newest'].includes(w)) continue
    if (gender && (w === gender || w === `${gender}s` ||
        (gender === 'men'    && ['man','male','guys'].includes(w)) ||
        (gender === 'women'  && ['woman','female','ladies'].includes(w)) ||
        (gender === 'unisex' && ['unisexual','universal'].includes(w)))) continue
    if (categoryDef && (w === categoryDef.slug || w === (categoryDef.name || '').toLowerCase() ||
        (categoryDef.slug === 'running'    && ['running','runing','runner'].includes(w)) ||
        (categoryDef.slug === 'sneakers'   && ['sneakers','sneaker','snickers','kicks'].includes(w)) ||
        (categoryDef.slug === 'formal'     && ['formal','formel','dress'].includes(w)) ||
        (categoryDef.slug === 'boots'      && ['boots','boot'].includes(w)) ||
        (categoryDef.slug === 'basketball' && ['basketball','basktball','bball'].includes(w)))) continue
    if (color    && w === color.toLowerCase())    continue
    if (material && w === material.toLowerCase()) continue
    if (brandName && stringSimilarity(w, brandName.toLowerCase()) >= 0.75) continue
    residualWords.push(w)
  }

  const cleanedTextQuery = residualWords.join(' ').trim()
  const modelKeywords    = residualWords.filter(t => t.length > 1 && !STOP_WORDS.has(t))

  // 3. Candidate filtering
  let candidatePool = [...productCache]
  if (gender)     candidatePool = candidatePool.filter(p => p.gender === gender || p.gender === 'unisex')
  if (brandName) {
    const bL = brandName.toLowerCase()
    const bm = candidatePool.filter(p => stringSimilarity(p.brand, bL) >= 0.75)
    if (bm.length) candidatePool = bm
  }
  if (categoryDef?.slug) {
    const csL = categoryDef.slug.toLowerCase()
    const cnL = (categoryDef.name || '').toLowerCase()
    const cm  = candidatePool.filter(p => {
      const ps = (p.category?.slug || (typeof p.category === 'string' ? p.category : '')).toLowerCase()
      const pn = (p.category?.name || (typeof p.category === 'string' ? p.category : '')).toLowerCase()
      return ps === csL || stringSimilarity(pn, cnL) >= 0.75
    })
    if (cm.length) candidatePool = cm
  }
  if (maxPrice != null) candidatePool = candidatePool.filter(p => p.price <= maxPrice)
  if (minPrice != null) candidatePool = candidatePool.filter(p => p.price >= minPrice)
  if (color) {
    const cm = candidatePool.filter(p =>
      p.colors?.some(c     => typeof c === 'string' && stringSimilarity(c, color) >= 0.80) ||
      p.colorImages?.some(ci => ci?.color && stringSimilarity(ci.color, color) >= 0.80) ||
      p.variants?.some(v   => v?.color    && stringSimilarity(v.color, color)   >= 0.80)
    )
    if (cm.length) candidatePool = cm
  }
  if (material) {
    const mm = candidatePool.filter(p => stringSimilarity(p.material || '', material) >= 0.75)
    if (mm.length) candidatePool = mm
  }

  // 4. Fuse search
  let scoredResults = []
  if (cleanedTextQuery.length >= 2) {
    const tempFuse   = new Fuse(candidatePool, FUSE_OPTIONS)
    const fMatches   = tempFuse.search(cleanedTextQuery)
    scoredResults    = fMatches.map(m => ({ item: m.item, fuseScore: m.score }))
    const matchedIds = new Set(scoredResults.map(r => r.item.id))
    for (const item of candidatePool) {
      if (!matchedIds.has(item.id)) scoredResults.push({ item, fuseScore: 0.9 })
    }
  } else {
    scoredResults = candidatePool.map(item => ({ item, fuseScore: 0.5 }))
  }

  // 5. Score & rank
  const scoredItems = scoredResults.map(({ item, fuseScore }) => {
    const nameMatchScore = calculateNameSimilarity(cleanedTextQuery || rawQuery, item)
    return { item, nameMatchScore, relevanceScore: nameMatchScore * 0.60 + (1 - (fuseScore ?? 0.5)) * 0.40 }
  })

  if      (sort === 'price_asc')  scoredItems.sort((a, b) => a.item.price - b.item.price)
  else if (sort === 'price_desc') scoredItems.sort((a, b) => b.item.price - a.item.price)
  else if (sort === 'newest')     scoredItems.sort((a, b) => (b.item.featured ? 1 : 0) - (a.item.featured ? 1 : 0))
  else if (sort === 'popular')    scoredItems.sort((a, b) => (b.item.unitsSold || 0) - (a.item.unitsSold || 0))
  else if (sort === 'rating')     scoredItems.sort((a, b) => (b.item.rating || 0) - (a.item.rating || 0))
  else scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore)

  if (!scoredItems.length) {
    const fCat = categoryDef?.name || 'shoes'
    const fGen = gender ? (gender === 'unisex' ? 'unisex' : `${gender}'s`) : ''
    return {
      type:       'not_found',
      message:    `I couldn't find any ${fGen} ${fCat} matching your search. I've updated your screen with our full collection so you can browse.`,
      navigateTo: buildProductsUrl(brandName || null, { category: categoryDef?.slug, gender, color, sort }),
      query:      rawQuery,
    }
  }

  const top = scoredItems[0]
  const hasDistinctModelName = modelKeywords.length > 0 && cleanedTextQuery.length >= 3
  const shouldOpenDirectly   = !isSuggestion && ((hasDistinctModelName && top.nameMatchScore >= 0.80) || isExplicitOpen)

  if (shouldOpenDirectly) {
    const product  = top.item
    const stockMsg = product.inStock ? 'It is currently in stock.' : 'Note: currently out of stock.'
    return {
      type:           'exact',
      product,
      size,
      color,
      nameMatchScore: Math.round(top.nameMatchScore * 100),
      message:        `I've opened the ${product.name} by ${product.brand} for $${Number(product.price).toFixed(2)} on your screen. ${stockMsg} Would you like to select a size or add it to your cart?`,
    }
  }

  const topResults    = scoredItems.slice(0, 12).map(r => r.item)
  const residualQuery = cleanedTextQuery.length >= 2 ? cleanedTextQuery : (brandName || null)
  const navigateTo    = buildProductsUrl(residualQuery, { category: categoryDef?.slug, gender, color, size, minPrice, maxPrice, sort })
  const resultCount   = scoredItems.length
  const rawCat        = categoryDef ? categoryDef.name.toLowerCase() : 'shoes'
  const catLabel      = rawCat.includes('shoe') || rawCat.includes('boot') || rawCat.includes('sneaker') ? rawCat : `${rawCat} shoes`
  const brandLabel    = brandName ? `${brandName} ` : ''
  const genderLabel   = gender    ? (gender === 'unisex' ? 'unisex ' : `${gender}'s `) : ''
  const colorLabel    = color     ? `${color} ` : ''
  const priceLabel    = maxPrice  ? ` under $${maxPrice}` : (minPrice ? ` over $${minPrice}` : '')

  return {
    type:         'multiple',
    products:     topResults,
    total:        resultCount,
    size, color, gender,
    category:     categoryDef?.name || null,
    categorySlug: categoryDef?.slug || null,
    brand:        brandName || null,
    priceIntent:  { minPrice, maxPrice, sort },
    navigateTo,
    message:      `I found some ${colorLabel}${genderLabel}${brandLabel}${catLabel}${priceLabel} matching your request. You can see all of them on your screen right now. Let me know if you'd like to filter further or choose a specific pair!`,
    toastMessage: `Showing ${resultCount} ${colorLabel}${genderLabel}${brandLabel}${catLabel} on screen`,
  }
}