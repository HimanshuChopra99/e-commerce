import { asyncHandler } from '../../utils/async-handler.js'
import { ok, created, noContent, paginated } from '../../utils/api-response.js'
import { getPagination, buildMeta, toCsv } from '../../utils/helpers.js'
import * as productService from '../../services/product.service.js'
import * as productModel from '../../models/product.model.js'
import { ApiError } from '../../utils/api-error.js'

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const { items, total } = await productService.listForAdmin({
    limit,
    offset,
    status: req.query.status,
    categorySlug: req.query.category,
    gender: req.query.gender,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    size: req.query.size,
    color: req.query.color,
    search: req.query.q,
    featured: req.query.featured,
    sort: req.query.sort,
  })

  paginated(
    res,
    items.map(({ internalId: _i, ...p }) => p),
    buildMeta({ page, limit, total })
  )
})

export const stats = asyncHandler(async (_req, res) => {
  ok(res, await productModel.getStats())
})

export const lowStock = asyncHandler(async (req, res) => {
  const limit = Math.min(200, Number.parseInt(req.query.limit, 10) || 50)
  ok(res, await productService.getLowStock(limit))
})

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await productService.getForAdmin(req.params.id))
})

export const create = asyncHandler(async (req, res) => {
  created(res, await productService.create(req.body))
})

export const update = asyncHandler(async (req, res) => {
  ok(res, await productService.update(req.params.id, req.body))
})

export const remove = asyncHandler(async (req, res) => {
  await productService.remove(req.params.id)
  noContent(res)
})

export const updateVariants = asyncHandler(async (req, res) => {
  ok(res, await productService.updateVariantStock(req.params.id, req.body.variants))
})

export const bulkStatus = asyncHandler(async (req, res) => {
  const updated = await productService.bulkStatus(req.body.productIds, req.body.status)
  ok(res, { updated })
})

export const bulkRemove = asyncHandler(async (req, res) => {
  const deleted = await productService.bulkRemove(req.body.productIds)
  ok(res, { deleted })
})

/** POST /api/admin/products/image-uploads — persist assets before product save. */
export const uploadImageAssets = asyncHandler(async (req, res) => {
  const urls = (req.files ?? []).map((file) => `/uploads/${file.filename}`)
  if (!urls.length) throw ApiError.badRequest('Select at least one image to upload.')
  created(res, { images: urls })
})

/** POST /api/admin/products/:id/images — backwards-compatible scoped upload. */
export const uploadImages = asyncHandler(async (req, res) => {
  const urls = (req.files ?? []).map((file) => `/uploads/${file.filename}`)
  if (!urls.length) throw ApiError.badRequest('Select at least one image to upload.')
  ok(res, await productService.addImages(req.params.id, urls, req.body?.color))
})

export const deleteImage = asyncHandler(async (req, res) => {
  const url = req.query.url ?? req.body?.url
  if (!url) throw ApiError.badRequest('An image URL is required.')
  ok(res, await productService.removeImage(req.params.id, url, req.query.color ?? req.body?.color))
})

export const exportCsv = asyncHandler(async (req, res) => {
  const { items } = await productService.listForAdmin({
    limit: 10000,
    offset: 0,
    status: req.query.status,
    search: req.query.q,
  })

  const csv = toCsv(items, [
    { header: 'ID', value: (p) => p.id },
    { header: 'Name', value: (p) => p.name },
    { header: 'SKU', value: (p) => p.sku },
    { header: 'Category', value: (p) => p.category?.name ?? '' },
    { header: 'Gender', value: (p) => p.gender },
    { header: 'Price', value: (p) => p.price },
    { header: 'Compare At', value: (p) => p.compareAtPrice ?? '' },
    { header: 'Cost', value: (p) => p.costPerItem ?? '' },
    { header: 'Stock', value: (p) => p.totalStock },
    { header: 'Sold', value: (p) => p.unitsSold },
    { header: 'Status', value: (p) => p.status },
    { header: 'Created', value: (p) => p.createdAt?.toISOString?.() ?? p.createdAt },
  ])

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="products.csv"')
  res.send(csv)
})
