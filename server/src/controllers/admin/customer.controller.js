import { asyncHandler } from '../../utils/async-handler.js'
import { ok, paginated } from '../../utils/api-response.js'
import { getPagination, buildMeta, toCsv } from '../../utils/helpers.js'
import { ApiError } from '../../utils/api-error.js'
import * as userModel from '../../models/user.model.js'
import * as orderService from '../../services/order.service.js'

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const { items, total } = await userModel.listCustomers({
    search: req.query.q,
    status: req.query.status,
    tier: req.query.tier,
    sort: req.query.sort,
    limit,
    offset,
  })

  paginated(
    res,
    items.map(({ internalId: _i, ...c }) => c),
    buildMeta({ page, limit, total })
  )
})

/** Full profile: stats, address, favourite products. */
export const getOne = asyncHandler(async (req, res) => {
  const customer = await userModel.findByPublicId(req.params.id)
  if (!customer || customer.role !== 'customer') {
    throw ApiError.notFound('Customer not found.')
  }

  const [stats, favourites] = await Promise.all([
    userModel.getCustomerStats(customer.internalId),
    userModel.getFavouriteProducts(customer.internalId, 4),
  ])

  const { internalId: _i, ...safe } = customer
  ok(res, { ...safe, ...stats, favouriteProducts: favourites })
})

export const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)
  const { items, total } = await orderService.getCustomerOrders(req.params.id, { limit, offset })
  paginated(res, items, buildMeta({ page, limit, total }))
})

export const update = asyncHandler(async (req, res) => {
  const customer = await userModel.findByPublicId(req.params.id)
  if (!customer || customer.role !== 'customer') {
    throw ApiError.notFound('Customer not found.')
  }

  const updated = await userModel.update(customer.internalId, req.body)
  const { internalId: _i, ...safe } = updated
  ok(res, safe)
})

/** Blocking a customer also invalidates their existing sessions. */
export const updateStatus = asyncHandler(async (req, res) => {
  const customer = await userModel.findByPublicId(req.params.id)
  if (!customer || customer.role !== 'customer') {
    throw ApiError.notFound('Customer not found.')
  }

  const updated = await userModel.update(customer.internalId, { status: req.body.status })

  if (req.body.status === 'blocked') {
    const tokenModel = await import('../../models/auth-token.model.js')
    await tokenModel.revokeAllForUser(customer.internalId, 'refresh')
  }

  const { internalId: _i, ...safe } = updated
  ok(res, safe)
})

export const exportCsv = asyncHandler(async (req, res) => {
  const { items } = await userModel.listCustomers({
    search: req.query.q,
    status: req.query.status,
    tier: req.query.tier,
    limit: 10000,
    offset: 0,
  })

  const csv = toCsv(items, [
    { header: 'ID', value: (c) => c.publicId },
    { header: 'First Name', value: (c) => c.firstName },
    { header: 'Last Name', value: (c) => c.lastName },
    { header: 'Email', value: (c) => c.email },
    { header: 'Phone', value: (c) => c.phone ?? '' },
    { header: 'City', value: (c) => c.address?.city ?? '' },
    { header: 'State', value: (c) => c.address?.state ?? '' },
    { header: 'Orders', value: (c) => c.totalOrders },
    { header: 'Total Spent', value: (c) => c.totalSpent },
    { header: 'Avg Order', value: (c) => c.avgOrderValue },
    { header: 'Tier', value: (c) => c.tier },
    { header: 'Status', value: (c) => c.status },
    { header: 'Joined', value: (c) => c.createdAt?.toISOString?.() ?? c.createdAt },
  ])

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"')
  res.send(csv)
})
