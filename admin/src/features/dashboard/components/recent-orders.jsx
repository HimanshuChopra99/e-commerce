import { Link } from 'react-router-dom'
import { formatCurrency, formatDate } from '@/config/brand'
import { getDisplayNameInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge'

/** The latest orders placed on the storefront. */
export function RecentOrders({ orders = [] }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No recent orders yet.
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {orders.map((order) => {
        const customerName = order.customerName || order.user?.fullName || `${order.shippingAddress?.firstName || 'Guest'} ${order.shippingAddress?.lastName || ''}`.trim() || 'Customer'
        const orderNumber = order.orderNumber || order.id
        const itemCount = order.items ? order.items.reduce((s, i) => s + (i.quantity || 1), 0) : order.itemCount || 1
        const date = order.placedAt || order.createdAt || new Date()
        const total = order.grandTotal || order.total || 0

        return (
          <div key={order.id || orderNumber} className='flex items-center gap-4'>
            <Avatar className='size-9'>
              <AvatarFallback className='text-xs'>
                {getDisplayNameInitials(customerName)}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-wrap items-center justify-between gap-2'>
              <div className='min-w-0 space-y-1'>
                <Link
                  to={`/orders/${order.id || orderNumber}`}
                  className='block truncate text-sm leading-none font-medium hover:underline'
                >
                  {customerName}
                </Link>
                <p className='truncate text-xs text-muted-foreground'>
                  {orderNumber} · {itemCount} item
                  {itemCount > 1 ? 's' : ''} ·{' '}
                  {formatDate(date, {
                    day: '2-digit',
                    month: 'short',
                  })}
                </p>
              </div>
              <div className='flex items-center gap-3'>
                <OrderStatusBadge status={order.status || 'pending'} />
                <div className='font-medium text-nowrap'>
                  {formatCurrency(total)}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
