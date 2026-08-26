import { asyncHandler } from '../../utils/async-handler.js';
import { ok, created, noContent, paginated } from '../../utils/api-response.js';
import { getPagination, buildMeta } from '../../utils/helpers.js';
import * as categoryService from '../../services/category.service.js';

export const list = asyncHandler(async (_req, res) => {
  ok(res, await categoryService.listForAdmin());
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await categoryService.getById(req.params.id));
});

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { category, items, total } = await categoryService.listProducts(
    req.params.id,
    {
      limit,
      offset,
      sort: req.query.sort,
    }
  );
  paginated(res, items, { ...buildMeta({ page, limit, total }), category });
});

export const create = asyncHandler(async (req, res) => {
  created(res, await categoryService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, await categoryService.update(req.params.id, req.body));
});

/** Products in a deleted category become uncategorised, they aren't removed. */
export const remove = asyncHandler(async (req, res) => {
  ok(res, await categoryService.remove(req.params.id));
});

export const assignProducts = asyncHandler(async (req, res) => {
  ok(
    res,
    await categoryService.assignProducts(req.params.id, req.body.productIds)
  );
});

export const removeProduct = asyncHandler(async (req, res) => {
  await categoryService.removeProduct(req.params.id, req.params.productId);
  noContent(res);
});
