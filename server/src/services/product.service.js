import { withTransaction, pool, isDatabaseConnected } from '../config/database.js'
import { ApiError } from '../utils/api-error.js'
import { publicId, uniqueSlug, colorCode } from '../utils/helpers.js'
import * as productModel from '../models/product.model.js'
import * as variantModel from '../models/variant.model.js'
import * as categoryModel from '../models/category.model.js'
import * as orderModel from '../models/order.model.js'
import { env } from '../config/env.js'
import { memoryStore } from './memory-store.js'
import { getCachedJson, setCachedJson, deleteCachedPattern } from './cache.service.js'
import { CACHE_TTL } from '../utils/constants.js'
import { rebuildIndex } from './voice-search.service.js'

const MAX_COLOR_IMAGES = 48

// Prefix shared by every storefront-facing cache key so a single pattern scan
// can invalidate the whole public catalogue when anything that affects it
// changes (product create/update/delete, stock changes, category changes).
const PUBLIC_CACHE_PREFIX = 'public:'

async function invalidatePublicCatalogue() {
  await deleteCachedPattern(`${PUBLIC_CACHE_PREFIX}*`)
  // Rebuild voice search index when products change (non-blocking)
  rebuildIndex().catch(() => {})
}

async function cachedPublic(key, ttlSeconds, compute) {
  const cached = await getCachedJson(key)
  if (cached) return cached
  const value = await compute()
  // Public catalogue is invalidated on every mutation, so the TTL is a safety
  // net rather than the source of freshness. Per-type TTLs (CACHE_TTL) let
  // slowly-changing data (categories) live longer than fast-changing lists.
  await setCachedJson(key, value, ttlSeconds)
  return value
}

/**
 * Keep media in one canonical shape. `colorImages` drives the product page;
 * `images` is a flattened compatibility gallery for catalogue cards, order
 * snapshots, and products created before colour galleries existed.
 */
function normalizeColorImages(entries = []) {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => ({
    color: String(entry.color).trim(),
    images: [...new Set((entry.images ?? []).map((image) => String(image).trim()).filter(Boolean))],
  }))
}

function flattenColorImages(entries) {
  return [...new Set(entries.flatMap((entry) => entry.images))].slice(0, MAX_COLOR_IMAGES)
}

function canonicalMedia(input) {
  if (input.colorImages === undefined) return input
  const colorImages = normalizeColorImages(input.colorImages)
  return {
    ...input,
    colorImages,
    images: colorImages.length ? flattenColorImages(colorImages) : (input.images ?? []),
  }
}

/* ----------------------------- Storefront ------------------------------ */

export async function listPublic(filters) {
  return cachedPublic(
    `${PUBLIC_CACHE_PREFIX}products:list:${JSON.stringify(filters)}`,
    CACHE_TTL.PRODUCTS,
    async () => {
      const { items, total } = await productModel.findAll({ ...filters, storefront: true })
      return { items: items.map(productModel.toPublicProduct), total }
    }
  )
}

export async function getPublicBySlug(slug) {
  return cachedPublic(`${PUBLIC_CACHE_PREFIX}products:slug:${slug}`, CACHE_TTL.PRODUCT, async () => {
    const product = await productModel.findBySlug(slug)
    if (!product || product.status !== 'active') {
      throw ApiError.notFound('Product not found.')
    }

    const variants = await variantModel.findByProduct(product.internalId || product.id, { activeOnly: true })

    return {
      ...productModel.toPublicProduct(product),
      variants: variants.map(variantModel.toPublicVariant),
      colors: [...new Set(variants.map((v) => v.color))],
      sizes: [...new Set(variants.map((v) => v.size))].sort((a, b) => Number(a) - Number(b)),
    }
  })
}

export async function getRelated(slug, limit = 4) {
  return cachedPublic(`${PUBLIC_CACHE_PREFIX}products:related:${slug}:${limit}`, CACHE_TTL.PRODUCT, async () => {
    const product = await productModel.findBySlug(slug)
    if (!product) throw ApiError.notFound('Product not found.')
    if (!product.category) return []

    const category = await categoryModel.findByPublicId(product.category.id)
    if (!category) return []

    const items = await productModel.findRelated(category.internalId, product.internalId, limit)
    return items.map(productModel.toPublicProduct)
  })
}

export async function listFeatured(limit = 8) {
  return cachedPublic(`${PUBLIC_CACHE_PREFIX}products:featured:${limit}`, CACHE_TTL.PRODUCTS, async () => {
    const { items } = await productModel.findAll({
      storefront: true, featured: true, limit, offset: 0, sort: 'popular',
    })
    return items.map(productModel.toPublicProduct)
  })
}

/* -------------------------------- Admin -------------------------------- */

export async function listForAdmin(filters) {
  return productModel.findAll(filters)
}

export async function getForAdmin(productPublicId) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

  const [variants, sales, recentOrders] = await Promise.all([
    variantModel.findByProduct(product.internalId || product.id),
    orderModel.getProductSalesStats(product.internalId || product.id),
    orderModel.findByProduct(product.internalId || product.id, 8),
  ])

  return {
    ...product,
    internalId: undefined,
    colors: [...new Set(variants.map((variant) => variant.color))],
    variants: variants.map(({ internalId: _i, productId: _p, ...v }) => v),
    sales,
    recentOrders: recentOrders.map(orderModel.toPublicOrder),
  }
}

/**
 * Creates a product plus one variant per colour × size.
 */
export async function create(rawInput) {
  const input = canonicalMedia(rawInput)

  if (await productModel.skuExists(input.sku)) {
    throw ApiError.conflict(`SKU "${input.sku}" is already in use.`)
  }

  let categoryInternalId = null
  if (input.categoryId) {
    const category = await categoryModel.findByPublicId(input.categoryId)
    if (!category) throw ApiError.badRequest('That category does not exist.')
    categoryInternalId = category.internalId
  }

  const slug = await uniqueSlug(input.name, productModel.slugExists)
  const stocked = input.variants.filter((v) => v.stock > 0)
  if (!stocked.length) throw ApiError.badRequest('Add stock to at least one size.')

  const totalStock = stocked.reduce((sum, v) => sum + v.stock, 0) * (input.colors?.length || 1)

  if (isDatabaseConnected()) {
    try {
      const res = await withTransaction(async (conn) => {
        const productInternalId = await productModel.create(
          {
            publicId: publicId(),
            categoryInternalId,
            name: input.name.trim(),
            slug,
            sku: input.sku.trim().toUpperCase(),
            description: input.description.trim(),
            brand: input.brand.trim(),
            gender: input.gender,
            material: input.material || null,
            price: input.price,
            compareAtPrice: input.compareAtPrice || null,
            costPerItem: input.costPerItem || null,
            status: totalStock === 0 && input.status === 'active' ? 'out_of_stock' : input.status,
            featured: input.featured,
            images: input.images ?? [],
            colorImages: input.colorImages ?? [],
            tags: input.tags ?? [],
          },
          conn
        )

        for (const color of input.colors) {
          for (const variant of stocked) {
            await variantModel.create(
              {
                publicId: publicId(),
                productInternalId,
                size: variant.size,
                color,
                sku: `${input.sku.toUpperCase()}-${String(variant.size).padStart(2, '0')}-${colorCode(color)}`,
                stock: variant.stock,
              },
              conn
            )
          }
        }

        await productModel.recalcStock(productInternalId, conn)
        const created = await productModel.findByInternalId(productInternalId, conn)
        return { ...created, internalId: undefined }
      })
      if (res) {
        await invalidatePublicCatalogue()
        return res
      }
    } catch (err) {
      if (err.statusCode) throw err
    }
  }

  // Fallback to memory store
  const newProduct = memoryStore.addProduct({
    name: input.name.trim(),
    slug,
    sku: input.sku.trim().toUpperCase(),
    description: input.description.trim(),
    brand: input.brand.trim(),
    gender: input.gender,
    material: input.material || null,
    price: input.price,
    compareAtPrice: input.compareAtPrice || null,
    costPerItem: input.costPerItem || null,
    status: totalStock === 0 && input.status === 'active' ? 'out_of_stock' : input.status,
    featured: input.featured,
    categoryId: input.categoryId,
    images: input.images ?? [],
    colorImages: input.colorImages ?? [],
    tags: input.tags ?? [],
    colors: input.colors,
    variants: input.colors.flatMap((color) =>
      stocked.map((v) => {
        const vId = publicId()
        return {
          id: vId,
          publicId: vId,
          size: v.size,
          color,
          sku: `${input.sku.toUpperCase()}-${String(v.size).padStart(2, '0')}-${colorCode(color)}`,
          stock: v.stock,
          reserved: 0,
          isActive: true,
        }
      })
    ),
  })
  newProduct.totalStock = totalStock
  await invalidatePublicCatalogue()
  return newProduct
}

export async function update(productPublicId, rawInput) {
  const input = canonicalMedia(rawInput)
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

  // PATCH requests may update galleries without resending `colors`. Validate
  // those assignments against the product's actual variants as a second line
  // of defence after the request schema.
  if (input.colorImages?.length && !input.colors) {
    const existingVariants = await variantModel.findByProduct(product.internalId || product.id)
    const productColors = [...new Set(existingVariants.map((variant) => variant.color))]
    const assigned = new Set(input.colorImages.map((entry) => entry.color.toLocaleLowerCase()))
    const invalid = input.colorImages.find(
      (entry) => !productColors.some((color) => color.toLocaleLowerCase() === entry.color.toLocaleLowerCase())
    )
    const missing = productColors.find((color) => !assigned.has(color.toLocaleLowerCase()))
    if (invalid) throw ApiError.badRequest(`Colour "${invalid.color}" is not available on this product.`)
    if (missing) throw ApiError.badRequest(`Add at least one image for ${missing}.`)
  }

  if (input.sku && input.sku !== product.sku) {
    if (await productModel.skuExists(input.sku, product.internalId)) {
      throw ApiError.conflict(`SKU "${input.sku}" is already in use.`)
    }
  }

  const patch = { ...input }

  if (input.categoryId !== undefined) {
    if (input.categoryId === null || input.categoryId === '') {
      patch.categoryInternalId = null
    } else {
      const category = await categoryModel.findByPublicId(input.categoryId)
      if (!category) throw ApiError.badRequest('That category does not exist.')
      patch.categoryInternalId = category.internalId
    }
    delete patch.categoryId
  }

  if (input.name && input.name !== product.name) {
    patch.slug = await uniqueSlug(input.name, productModel.slugExists, product.internalId)
  }

  if (isDatabaseConnected()) {
    try {
      const res = await withTransaction(async (conn) => {
        await productModel.update(product.internalId, patch, conn)

        if (input.variants || input.colors) {
          const existing = await variantModel.findByProduct(product.internalId)
          const held = existing.filter((v) => v.reserved > 0)
          if (held.length) {
            throw ApiError.conflict(
              'Some sizes are reserved by an in-flight checkout. Try again in a few minutes.'
            )
          }

          const colors = input.colors ?? [...new Set(existing.map((v) => v.color))]
          const variants = input.variants ?? [
            ...new Map(existing.map((v) => [String(v.size), { size: v.size, stock: v.stock }])).values(),
          ]
          const sku = (input.sku ?? product.sku).toUpperCase()

          await variantModel.deleteByProduct(product.internalId, conn)

          for (const color of colors) {
            for (const variant of variants.filter((v) => v.stock > 0)) {
              await variantModel.create(
                {
                  publicId: publicId(),
                  productInternalId: product.internalId,
                  size: variant.size,
                  color,
                  sku: `${sku}-${String(variant.size).padStart(2, '0')}-${colorCode(color)}`,
                  stock: variant.stock,
                },
                conn
              )
            }
          }
        }

        await productModel.recalcStock(product.internalId, conn)
        const updated = await productModel.findByInternalId(product.internalId, conn)
        return { ...updated, internalId: undefined }
      })
      if (res) {
        await invalidatePublicCatalogue()
        return res
      }
    } catch (err) {
      if (err.statusCode) throw err
    }
  }

  // Memory store fallback. Mirror the database variant rebuild so development
  // without MySQL behaves exactly like production.
  if (input.variants || input.colors) {
    const existing = product.variants ?? []
    if (existing.some((variant) => Number(variant.reserved) > 0)) {
      throw ApiError.conflict(
        'Some sizes are reserved by an in-flight checkout. Try again in a few minutes.'
      )
    }
    const colors = input.colors ?? [...new Set(existing.map((variant) => variant.color))]
    const variants = input.variants ?? [
      ...new Map(existing.map((variant) => [
        String(variant.size),
        { size: variant.size, stock: variant.stock },
      ])).values(),
    ]
    const sku = (input.sku ?? product.sku).toUpperCase()
    patch.colors = colors
    patch.variants = colors.flatMap((color) =>
      variants.filter((variant) => variant.stock > 0).map((variant) => {
        const id = publicId()
        return {
          id,
          publicId: id,
          size: variant.size,
          color,
          sku: `${sku}-${String(variant.size).padStart(2, '0')}-${colorCode(color)}`,
          stock: variant.stock,
          reserved: 0,
          available: variant.stock,
          inStock: variant.stock > 0,
          isActive: true,
        }
      })
    )
    patch.totalStock = patch.variants.reduce((sum, variant) => sum + Number(variant.stock), 0)
  }
  const result = memoryStore.updateProduct(productPublicId, patch)
  await invalidatePublicCatalogue()
  return result
}

/** Adjusts stock for individual sizes without rebuilding the variant set. */
export async function updateVariantStock(productPublicId, variants) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

  if (isDatabaseConnected()) {
    try {
      const existing = await variantModel.findByProduct(product.internalId)
      const byKey = new Map(existing.map((v) => [`${v.size}|${v.color}`, v]))

      return await withTransaction(async (conn) => {
        for (const change of variants) {
          const key = `${change.size}|${change.color ?? existing[0]?.color}`
          const variant = byKey.get(key)

          if (variant) {
            if (change.stock < variant.reserved) {
              throw ApiError.conflict(
                `Size ${change.size} has ${variant.reserved} reserved; stock cannot go below that.`
              )
            }
            await variantModel.setStock(variant.internalId, change.stock, conn)
          } else if (change.stock > 0) {
            const color = change.color ?? existing[0]?.color ?? 'Black'
            await variantModel.create(
              {
                publicId: publicId(),
                productInternalId: product.internalId,
                size: change.size,
                color,
                sku: `${product.sku}-${String(change.size).padStart(2, '0')}-${colorCode(color)}`,
                stock: change.stock,
              },
              conn
            )
          }
        }

        await productModel.recalcStock(product.internalId, conn)
        const updated = await variantModel.findByProduct(product.internalId).then((rows) =>
          rows.map(({ internalId: _i, productId: _p, ...v }) => v)
        )
        await invalidatePublicCatalogue()
        return updated
      })
    } catch (err) {
      if (err.statusCode) throw err
    }
  }

  // Fallback to memory store
  if (product.variants) {
    for (const change of variants) {
      const v = product.variants.find((v) => v.size === change.size && (change.color ? v.color === change.color : true))
      if (v) {
        v.stock = change.stock
      }
    }
  }
  await invalidatePublicCatalogue()
  return product.variants || []
}

export async function remove(productPublicId) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

  const variants = await variantModel.findByProduct(product.internalId || product.id)
  if (variants.some((v) => v.reserved > 0)) {
    throw ApiError.conflict('This product has stock reserved by an open checkout.')
  }

  await productModel.softDelete(product.internalId || product.id)
  memoryStore.deleteProduct(productPublicId)
  await invalidatePublicCatalogue()
}

export async function bulkStatus(productPublicIds, status) {
  const ids = await resolveInternalIds(productPublicIds)
  if (isDatabaseConnected()) {
    try {
      const result = await productModel.bulkSetStatus(ids, status)
      await invalidatePublicCatalogue()
      return result
    } catch { }
  }
  let count = 0
  for (const id of productPublicIds) {
    if (memoryStore.updateProduct(id, { status })) count++
  }
  await invalidatePublicCatalogue()
  return count
}

export async function bulkRemove(productPublicIds) {
  const ids = await resolveInternalIds(productPublicIds)
  if (isDatabaseConnected()) {
    try {
      const result = await productModel.bulkSoftDelete(ids)
      await invalidatePublicCatalogue()
      return result
    } catch { }
  }
  let count = 0
  for (const id of productPublicIds) {
    if (memoryStore.deleteProduct(id)) count++
  }
  await invalidatePublicCatalogue()
  return count
}

export async function addImages(productPublicId, urls, color = null) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

  let colorImages = normalizeColorImages(product.colorImages)
  let images

  if (color) {
    const variants = await variantModel.findByProduct(product.internalId || product.id)
    const actualColor = [...new Set(variants.map((variant) => variant.color))].find(
      (value) => value.toLocaleLowerCase() === String(color).trim().toLocaleLowerCase()
    )
    if (!actualColor) throw ApiError.badRequest('That colour is not available on this product.')

    const current = colorImages.find(
      (entry) => entry.color.toLocaleLowerCase() === actualColor.toLocaleLowerCase()
    )
    if (current) {
      current.images = [...new Set([...current.images, ...urls])].slice(0, 8)
    } else {
      colorImages.push({ color: actualColor, images: [...new Set(urls)].slice(0, 8) })
    }
    images = flattenColorImages(colorImages)
  } else {
    images = [...new Set([...(product.images ?? []), ...urls])].slice(0, MAX_COLOR_IMAGES)
  }

  const patch = color ? { images, colorImages } : { images }
  await productModel.update(product.internalId || product.id, patch)
  memoryStore.updateProduct(productPublicId, patch)
  await invalidatePublicCatalogue()
  return { images, colorImages }
}

export async function removeImage(productPublicId, url, color = null) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

  let colorImages = normalizeColorImages(product.colorImages)
  if (color) {
    colorImages = colorImages
      .map((entry) => entry.color.toLocaleLowerCase() === String(color).toLocaleLowerCase()
        ? { ...entry, images: entry.images.filter((image) => image !== url) }
        : entry)
      .filter((entry) => entry.images.length > 0)
  } else if (colorImages.length) {
    colorImages = colorImages
      .map((entry) => ({ ...entry, images: entry.images.filter((image) => image !== url) }))
      .filter((entry) => entry.images.length > 0)
  }

  const images = colorImages.length
    ? flattenColorImages(colorImages)
    : (product.images ?? []).filter((image) => image !== url)
  const patch = { images, colorImages }
  await productModel.update(product.internalId || product.id, patch)
  memoryStore.updateProduct(productPublicId, patch)
  await invalidatePublicCatalogue()
  return patch
}

export async function getLowStock(limit = 50) {
  const items = await productModel.findLowStock(env.business.lowStockThreshold, limit)
  return items.map(({ internalId: _i, ...p }) => p)
}

async function resolveInternalIds(publicIds) {
  if (!publicIds?.length) return []
  if (isDatabaseConnected()) {
    try {
      const placeholders = publicIds.map(() => '?').join(',')
      const [rows] = await pool.query(
        `SELECT id FROM products WHERE public_id IN (${placeholders})`,
        publicIds
      )
      return rows.map((r) => r.id)
    } catch { }
  }
  return publicIds
}
