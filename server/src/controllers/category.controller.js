import { asyncHandler } from '../utils/async-handler.js';
import { ok, paginated } from '../utils/api-response.js';
import { getPagination, buildMeta } from '../utils/helpers.js';
import * as categoryService from '../services/category.service.js';
import * as productService from '../services/product.service.js';

/** GET /api/categories */
export const list = asyncHandler(async (_req, res) => {
  ok(res, await categoryService.listPublic());
});

/** GET /api/categories/:slug */
export const getBySlug = asyncHandler(async (req, res) => {
  ok(res, await categoryService.getBySlug(req.params.slug));
});

/** GET /api/categories/:slug/products */
export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);

  const { items, total } = await productService.listPublic({
    limit,
    offset,
    categorySlug: req.params.slug,
    gender: req.query.gender,
    minPrice: req.query.minPrice,
    maxPrice: req.query.maxPrice,
    size: req.query.size,
    color: req.query.color,
    sort: req.query.sort,
  });

  paginated(res, items, buildMeta({ page, limit, total }));
});
