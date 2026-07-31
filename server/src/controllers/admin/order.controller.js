import { asyncHandler } from '../../utils/async-handler.js'
import { ok, paginated } from '../../utils/api-response.js'
import { getPagination, buildMeta, toCsv } from '../../utils/helpers.js'
import * as orderService from '../../services/order.service.js'
import * as paymentService from '../../services/payment.service.js'

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)

  const { items, total } = await orderService.listForAdmin({
    limit,
    offset,
    status: req.query.status,
    paymentStatus: req.query.paymentStatus,
    paymentMethod: req.query.paymentMethod,
    search: req.query.q,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    minTotal: req.query.minTotal,
    maxTotal: req.query.maxTotal,
    sort: req.query.sort,
  })

  paginated(res, items, buildMeta({ page, limit, total }))
})

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await orderService.getOrder(req.params.id, req.user))
})

export const updateStatus = asyncHandler(async (req, res) => {
  const { status, ...extra } = req.body
  ok(res, await orderService.updateStatus(req.params.id, status, extra))
})

export const updateTracking = asyncHandler(async (req, res) => {
  ok(res, await orderService.updateTracking(req.params.id, req.body))
})

export const updateNote = asyncHandler(async (req, res) => {
  ok(res, await orderService.updateNote(req.params.id, req.body.adminNote))
})

export const refund = asyncHandler(async (req, res) => {
  ok(res, await paymentService.refundOrder(req.params.id, req.body))
})

export const exportCsv = asyncHandler(async (req, res) => {
  const { items } = await orderService.listForAdmin({
    limit: 10000,
    offset: 0,
    status: req.query.status,
    search: req.query.q,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
  })

  const csv = toCsv(items, [
    { header: 'Order', value: (o) => o.orderNumber },
    { header: 'Date', value: (o) => o.placedAt?.toISOString?.() ?? o.placedAt },
    { header: 'Customer', value: (o) => o.customerName },
    { header: 'Email', value: (o) => o.customerEmail },
    { header: 'Items', value: (o) => o.itemCount },
    { header: 'Subtotal', value: (o) => o.subtotal },
    { header: 'Shipping', value: (o) => o.shipping },
    { header: 'Tax', value: (o) => o.tax },
    { header: 'Total', value: (o) => o.total },
    { header: 'Status', value: (o) => o.status },
    { header: 'Payment', value: (o) => o.paymentStatus },
    { header: 'Method', value: (o) => o.paymentMethod },
    { header: 'Courier', value: (o) => o.courier ?? '' },
    { header: 'Tracking', value: (o) => o.trackingNumber ?? '' },
    { header: 'City', value: (o) => o.shippingAddress.city },
    { header: 'Country', value: (o) => o.shippingAddress.country },
  ])

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"')
  res.send(csv)
})
