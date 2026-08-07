import { asyncHandler } from '../utils/async-handler.js'
import { ok, paginated } from '../utils/api-response.js'
import { getPagination, buildMeta } from '../utils/helpers.js'
import * as productService from '../services/product.service.js'
import * as variantModel from '../models/variant.model.js'
import { CACHE_TTL } from '../utils/constants.js'
import { getCachedJson, setCachedJson } from '../services/cache.service.js'

/** GET /api/products — the storefront catalogue. */
export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const { items, total } = await productService.listPublic({
    limit,
    offset,
    categorySlug: req.query.category,
    gender: req.query.gender,
    minPrice: req.query.minPrice ?? req.query.priceMin,
    maxPrice: req.query.maxPrice ?? req.query.priceMax,
    size: req.query.size,
    color: req.query.color,
    search: req.query.q,
    featured: req.query.featured,
    inStockOnly: req.query.inStock,
    sort: req.query.sort,
  })

  paginated(res, items, buildMeta({ page, limit, total }))
})

/** GET /api/products/featured */
export const featured = asyncHandler(async (req, res) => {
  const limit = Math.min(24, Number.parseInt(req.query.limit, 10) || 8)
  ok(res, await productService.listFeatured(limit))
})

/** GET /api/products/filters — populates the storefront filter UI. */
export const filters = asyncHandler(async (_req, res) => {
  const cacheKey = 'public:filters'
  const cached = await getCachedJson(cacheKey)
  if (cached) {
    ok(res, cached)
    return
  }

  const { GENDERS, COLORS } = await import('../utils/constants.js')
  const result = {
    sizes: await variantModel.availableSizes(),
    genders: [...GENDERS],
    colors: [...COLORS],
  }
  // Filter facets are static per deployment → long TTL.
  await setCachedJson(cacheKey, result, CACHE_TTL.FILTERS)
  ok(res, result)
})

/** GET /api/products/:slug */
export const getBySlug = asyncHandler(async (req, res) => {
  ok(res, await productService.getPublicBySlug(req.params.slug))
})

/** GET /api/products/:slug/related */
export const related = asyncHandler(async (req, res) => {
  ok(res, await productService.getRelated(req.params.slug, 4))
})
