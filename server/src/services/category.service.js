import { ApiError } from '../utils/api-error.js';
import { publicId, uniqueSlug } from '../utils/helpers.js';
import * as categoryModel from '../models/category.model.js';
import * as productModel from '../models/product.model.js';
import { pool, isDatabaseConnected } from '../config/database.js';
import { memoryStore } from './memory-store.js';
import { CACHE_TTL } from '../utils/constants.js';
import {
  getCachedJson,
  setCachedJson,
  deleteCachedPattern,
} from './cache.service.js';

async function invalidatePublicCatalogue() {
  await deleteCachedPattern('public:*');
}

export async function listPublic() {
  const cacheKey = 'public:categories';
  const cached = await getCachedJson(cacheKey);
  if (cached) return cached;
  const categories = await categoryModel.findAll({ activeOnly: true });
  const result = categories.map(categoryModel.toPublicCategory);
  // Categories change rarely → longest catalogue TTL.
  await setCachedJson(cacheKey, result, CACHE_TTL.CATEGORIES);
  return result;
}

export async function listForAdmin() {
  const categories = await categoryModel.findAll();
  return categories.map(categoryModel.toPublicCategory);
}

export async function getBySlug(slug) {
  const category = await categoryModel.findBySlug(slug);
  if (!category || !category.isActive)
    throw ApiError.notFound('Category not found.');
  return categoryModel.toPublicCategory(category);
}

export async function getById(categoryPublicId) {
  const category = await categoryModel.findByPublicId(categoryPublicId);
  if (!category) throw ApiError.notFound('Category not found.');
  return categoryModel.toPublicCategory(category);
}

export async function create(input) {
  const slug = await uniqueSlug(input.name, categoryModel.slugExists);

  const category = await categoryModel.create({
    publicId: publicId(),
    name: input.name.trim(),
    slug,
    description: input.description?.trim() || null,
    color: input.color ?? 'slate',
    image: input.image || null,
    sortOrder: input.sortOrder ?? 0,
  });

  await invalidatePublicCatalogue();
  return categoryModel.toPublicCategory(category);
}

export async function update(categoryPublicId, input) {
  const category = await categoryModel.findByPublicId(categoryPublicId);
  if (!category) throw ApiError.notFound('Category not found.');

  const patch = { ...input };
  if (input.name && input.name !== category.name) {
    patch.slug = await uniqueSlug(
      input.name,
      categoryModel.slugExists,
      category.internalId
    );
  }

  const updated = await categoryModel.update(category.internalId, patch);
  await invalidatePublicCatalogue();
  return categoryModel.toPublicCategory(updated);
}

/**
 * Deleting a category does NOT delete its products — the foreign key is
 * ON DELETE SET NULL, so they simply become uncategorised.
 */
export async function remove(categoryPublicId) {
  const category = await categoryModel.findByPublicId(categoryPublicId);
  if (!category) throw ApiError.notFound('Category not found.');

  await categoryModel.remove(category.internalId);
  await invalidatePublicCatalogue();
  return { productsUncategorised: category.productCount ?? 0 };
}

export async function listProducts(categoryPublicId, { limit, offset, sort }) {
  const category = await categoryModel.findByPublicId(categoryPublicId);
  if (!category) throw ApiError.notFound('Category not found.');

  const { items, total } = await productModel.findAll({
    categoryPublicId,
    limit,
    offset,
    sort,
  });
  return {
    category: categoryModel.toPublicCategory(category),
    items: items.map(({ internalId: _i, ...p }) => p),
    total,
  };
}

/** Bulk-assign products into a category (the "Add Products" dialog). */
export async function assignProducts(categoryPublicId, productPublicIds) {
  const category = await categoryModel.findByPublicId(categoryPublicId);
  if (!category) throw ApiError.notFound('Category not found.');
  if (!productPublicIds.length)
    throw ApiError.badRequest('Select at least one product.');

  if (isDatabaseConnected()) {
    try {
      const placeholders = productPublicIds.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT id FROM products WHERE public_id IN (${placeholders}) AND deleted_at IS NULL`,
        productPublicIds
      );
      if (!rows.length)
        throw ApiError.badRequest('None of those products exist.');

      const assigned = await productModel.assignCategory(
        rows.map((r) => r.id),
        category.internalId
      );
      await invalidatePublicCatalogue();
      return { assigned };
    } catch (err) {
      if (err.statusCode) throw err;
    }
  }

  // Memory store fallback
  let count = 0;
  for (const pid of productPublicIds) {
    const p = memoryStore.getProductByPublicId(pid);
    if (p) {
      p.categoryId = category.publicId || category.id;
      p.category = {
        id: category.publicId || category.id,
        name: category.name,
        slug: category.slug,
      };
      count++;
    }
  }
  await invalidatePublicCatalogue();
  return { assigned: count };
}

export async function removeProduct(categoryPublicId, productPublicId) {
  const category = await categoryModel.findByPublicId(categoryPublicId);
  if (!category) throw ApiError.notFound('Category not found.');

  const product = await productModel.findByPublicId(productPublicId);
  if (!product) throw ApiError.notFound('Product not found.');
  if (product.category?.id !== categoryPublicId) {
    throw ApiError.badRequest('That product is not in this category.');
  }

  await productModel.assignCategory([product.internalId], null);
  await invalidatePublicCatalogue();
}
