import { asyncHandler } from '../../utils/async-handler.js'
import { ok, created, paginated } from '../../utils/api-response.js'
import { getPagination, buildMeta, toCsv } from '../../utils/helpers.js'
import { ApiError } from '../../utils/api-error.js'
import * as dpModel from '../../models/delivery-partner.model.js'
import * as dpService from '../../services/delivery-partner.service.js'

/** Look up a partner by public id, throwing 404 when missing. */
async function requirePartner(id) {
  const partner = await dpModel.findByPublicId(id)
  if (!partner) throw ApiError.notFound('Delivery partner not found.')
  return partner
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const { items, total } = await dpModel.list({
    search: req.query.q,
    status: req.query.status,
    vehicleType: req.query.vehicleType,
    sort: req.query.sort,
    limit,
    offset,
  })

  paginated(res, items, buildMeta({ page, limit, total }))
})

/** Full profile: partner details + delivery statistics. */
export const getOne = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req.params.id)
  const stats = await dpModel.getStats(partner.internalId)
  ok(res, { ...partner, ...stats })
})

export const create = asyncHandler(async (req, res) => {
  const partner = await dpService.createPartner(req.body)
  created(res, partner)
})

export const update = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req.params.id)
  const { password, ...fields } = req.body

  if (password) {
    const bcrypt = (await import('bcryptjs')).default
    const passwordHash = await bcrypt.hash(password, 12)
    await dpModel.updatePassword(partner.internalId, passwordHash)
  }

  const updated = await dpModel.update(partner.internalId, fields)
  ok(res, updated)
})

export const updateStatus = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req.params.id)
  const updated = await dpModel.update(partner.internalId, { status: req.body.status })
  ok(res, updated)
})

export const remove = asyncHandler(async (req, res) => {
  const partner = await requirePartner(req.params.id)
  await dpModel.remove(partner.internalId)
  ok(res, { success: true, id: partner.publicId })
})

/** Orders assigned to this partner. */
export const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)
  const partner = await requirePartner(req.params.id)
  const { items, total } = await dpModel.findOrders(partner.internalId, { limit, offset })
  paginated(res, items, buildMeta({ page, limit, total }))
})

export const exportCsv = asyncHandler(async (req, res) => {
  const { items } = await dpModel.list({
    search: req.query.q,
    status: req.query.status,
    vehicleType: req.query.vehicleType,
    limit: 10000,
    offset: 0,
  })

  const csv = toCsv(items, [
    { header: 'ID', value: (p) => p.publicId },
    { header: 'First Name', value: (p) => p.firstName },
    { header: 'Last Name', value: (p) => p.lastName },
    { header: 'Email', value: (p) => p.email },
    { header: 'Phone', value: (p) => p.phone ?? '' },
    { header: 'Vehicle', value: (p) => p.vehicleType },
    { header: 'Online', value: (p) => (p.isOnline ? 'Yes' : 'No') },
    { header: 'Status', value: (p) => p.status },
    { header: 'Joined', value: (p) => (p.createdAt?.toISOString?.() ?? p.createdAt) },
  ])

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="delivery-partners.csv"')
  res.send(csv)
})
