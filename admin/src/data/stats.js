import { categoryLabels } from '@/features/products/products-data'
import { DEMO_NOW, customers, orders, products } from './seed'

/** "Today" for the demo dataset — shared with the seed generator. */
const NOW = DEMO_NOW
const DAY = 86_400_000
const revenueOrders = orders.filter((o) => o.status !== 'cancelled')
function sumRevenue(list) {
  return list.reduce((sum, o) => sum + o.total, 0)
}
function inWindow(from, to) {
  return revenueOrders.filter((o) => o.placedAt >= from && o.placedAt < to)
}

/** Percentage change between two periods, guarded against divide-by-zero. */
function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}
const last30 = inWindow(new Date(NOW.getTime() - 30 * DAY), NOW)
const prev30 = inWindow(
  new Date(NOW.getTime() - 60 * DAY),
  new Date(NOW.getTime() - 30 * DAY)
)
const newCustomers30 = customers.filter(
  (c) => c.createdAt >= new Date(NOW.getTime() - 30 * DAY)
).length
const prevNewCustomers30 = customers.filter(
  (c) =>
    c.createdAt >= new Date(NOW.getTime() - 60 * DAY) &&
    c.createdAt < new Date(NOW.getTime() - 30 * DAY)
).length
const revenue30 = sumRevenue(last30)
const revenuePrev30 = sumRevenue(prev30)
export const dashboardStats = {
  totalRevenue: sumRevenue(revenueOrders),
  revenue30,
  revenueChange: pctChange(revenue30, revenuePrev30),
  totalOrders: orders.length,
  orders30: last30.length,
  ordersChange: pctChange(last30.length, prev30.length),
  totalCustomers: customers.length,
  newCustomers30,
  customersChange: pctChange(newCustomers30, prevNewCustomers30),
  avgOrderValue: revenueOrders.length
    ? sumRevenue(revenueOrders) / revenueOrders.length
    : 0,
  aovChange: pctChange(
    last30.length ? revenue30 / last30.length : 0,
    prev30.length ? revenuePrev30 / prev30.length : 0
  ),
  totalProducts: products.length,
  activeProducts: products.filter((p) => p.status === 'active').length,
  unitsSold: revenueOrders.reduce((sum, o) => sum + o.itemCount, 0),
  pendingOrders: orders.filter((o) => o.status === 'pending').length,
  processingOrders: orders.filter((o) => o.status === 'processing').length,
  shippedOrders: orders.filter((o) => o.status === 'shipped').length,
  deliveredOrders: orders.filter((o) => o.status === 'delivered').length,
  returnedOrders: orders.filter((o) => o.status === 'returned').length,
  cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
}

/** Monthly revenue for the last 12 months — feeds the Overview bar chart. */
export const monthlyRevenue = Array.from(
  {
    length: 12,
  },
  (_, i) => {
    const start = new Date(NOW.getFullYear(), NOW.getMonth() - (11 - i), 1)
    const end = new Date(NOW.getFullYear(), NOW.getMonth() - (10 - i), 1)
    const bucket = revenueOrders.filter(
      (o) => o.placedAt >= start && o.placedAt < end
    )
    return {
      name: start.toLocaleString('en-US', {
        month: 'short',
      }),
      total: Math.round(sumRevenue(bucket)),
      orders: bucket.length,
    }
  }
)

/** Revenue split by product category — feeds the Analytics tab. */
export const revenueByCategory = (() => {
  const map = new Map()
  revenueOrders.forEach((order) => {
    order.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product) return
      const label = categoryLabels.get(product.category) ?? product.category
      map.set(label, (map.get(label) ?? 0) + item.price * item.quantity)
    })
  })
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      value: Math.round(value),
    }))
    .sort((a, b) => b.value - a.value)
})()

/** Units sold per size — tells you which size run to restock. */
export const salesBySize = (() => {
  const map = new Map()
  revenueOrders.forEach((order) => {
    order.items.forEach((item) => {
      map.set(item.size, (map.get(item.size) ?? 0) + item.quantity)
    })
  })
  return [...map.entries()]
    .map(([size, units]) => ({
      size,
      units,
    }))
    .sort((a, b) => Number(a.size) - Number(b.size))
})()

/** Order-status distribution for the analytics donut. */
export const ordersByStatus = [
  {
    name: 'Delivered',
    value: dashboardStats.deliveredOrders,
  },
  {
    name: 'Shipped',
    value: dashboardStats.shippedOrders,
  },
  {
    name: 'Processing',
    value: dashboardStats.processingOrders,
  },
  {
    name: 'Pending',
    value: dashboardStats.pendingOrders,
  },
  {
    name: 'Returned',
    value: dashboardStats.returnedOrders,
  },
  {
    name: 'Cancelled',
    value: dashboardStats.cancelledOrders,
  },
].filter((s) => s.value > 0)

/** Five most recent orders — feeds the "Recent Orders" dashboard card. */
export const recentOrders = [...orders]
  .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())
  .slice(0, 6)
