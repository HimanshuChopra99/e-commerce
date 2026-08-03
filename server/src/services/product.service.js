import { withTransaction, pool, isDatabaseConnected } from '../config/database.js'
import { ApiError } from '../utils/api-error.js'
import { publicId, uniqueSlug, colorCode } from '../utils/helpers.js'
import * as productModel from '../models/product.model.js'
import * as variantModel from '../models/variant.model.js'
import * as categoryModel from '../models/category.model.js'
import * as orderModel from '../models/order.model.js'
import { env } from '../config/env.js'
import { memoryStore } from './memory-store.js'

/* ----------------------------- Storefront ------------------------------ */

export async function listPublic(filters) {
  const { items, total } = await productModel.findAll({ ...filters, storefront: true })
  return { items: items.map(productModel.toPublicProduct), total }
}

export async function getPublicBySlug(slug) {
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
}

export async function getRelated(slug, limit = 4) {
  const product = await productModel.findBySlug(slug)
  if (!product) throw ApiError.notFound('Product not found.')
  if (!product.category) return []

  const category = await categoryModel.findByPublicId(product.category.id)
  if (!category) return []

  const items = await productModel.findRelated(category.internalId, product.internalId, limit)
  return items.map(productModel.toPublicProduct)
}

export async function listFeatured(limit = 8) {
  const { items } = await productModel.findAll({
    storefront: true, featured: true, limit, offset: 0, sort: 'popular',
  })
  return items.map(productModel.toPublicProduct)
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
    variants: variants.map(({ internalId: _i, productId: _p, ...v }) => v),
    sales,
    recentOrders: recentOrders.map(orderModel.toPublicOrder),
  }
}

/**
 * Creates a product plus one variant per colour × size.
 */
export async function create(input) {
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
      if (res) return res
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
  return newProduct
}

export async function update(productPublicId, input) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

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
          const variants = input.variants
            ?? existing.map((v) => ({ size: v.size, stock: v.stock }))
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
      if (res) return res
    } catch (err) {
      if (err.statusCode) throw err
    }
  }

  // Memory store fallback
  const updated = memoryStore.updateProduct(productPublicId, patch)
  return updated
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
        return variantModel.findByProduct(product.internalId).then((rows) =>
          rows.map(({ internalId: _i, productId: _p, ...v }) => v)
        )
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
}

export async function bulkStatus(productPublicIds, status) {
  const ids = await resolveInternalIds(productPublicIds)
  if (isDatabaseConnected()) {
    try {
      return await productModel.bulkSetStatus(ids, status)
    } catch { }
  }
  let count = 0
  for (const id of productPublicIds) {
    if (memoryStore.updateProduct(id, { status })) count++
  }
  return count
}

export async function bulkRemove(productPublicIds) {
  const ids = await resolveInternalIds(productPublicIds)
  if (isDatabaseConnected()) {
    try {
      return await productModel.bulkSoftDelete(ids)
    } catch { }
  }
  let count = 0
  for (const id of productPublicIds) {
    if (memoryStore.deleteProduct(id)) count++
  }
  return count
}

export async function addImages(productPublicId, urls) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

  const images = [...product.images, ...urls].slice(0, 10)
  await productModel.update(product.internalId || product.id, { images })
  memoryStore.updateProduct(productPublicId, { images })
  return images
}

export async function removeImage(productPublicId, url) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product) throw ApiError.notFound('Product not found.')

  const images = product.images.filter((i) => i !== url)
  await productModel.update(product.internalId || product.id, { images })
  memoryStore.updateProduct(productPublicId, { images })
  return images
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
