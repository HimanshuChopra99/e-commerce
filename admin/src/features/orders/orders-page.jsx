import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Clock,
  Download,
  PackageCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchAdminOrders } from '@/store/adminOrdersSlice'
import { formatCurrency } from '@/config/brand'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { StatCards } from '@/components/stat-cards'
import { orderStatuses, paymentMethods, paymentStatuses } from './orders-data'
import { OrdersBulkActions } from './components/orders-bulk-actions'
import { ordersColumns } from './components/orders-columns'

/** Orders list page. */
export function OrdersPage() {
  const dispatch = useDispatch()
  const { items: orders = [], loading } = useSelector((state) => state.adminOrders || {})

  useEffect(() => {
    dispatch(fetchAdminOrders({ limit: 100 }))
  }, [dispatch])

  const pending = orders.filter((o) => o.status === 'pending').length
  const processing = orders.filter((o) => o.status === 'processing').length
  const shipped = orders.filter((o) => o.status === 'shipped').length
  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0)

  const stats = [
    {
      label: 'Total Orders',
      value: String(orders.length),
      hint: 'All time',
      icon: ShoppingCart,
    },
    {
      label: 'Pending',
      value: String(pending),
      hint: 'Awaiting action',
      icon: Clock,
      accent: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Processing',
      value: String(processing),
      hint: 'Being packed',
      icon: PackageCheck,
    },
    {
      label: 'In Transit',
      value: String(shipped),
      hint: 'On the way',
      icon: Truck,
    },
  ]

  const normalizedOrders = orders.map((o) => ({
    ...o,
    orderNumber: o.orderNumber || o.id,
    customerName: o.customerName || o.user?.fullName || `${o.shippingAddress?.firstName || 'Guest'} ${o.shippingAddress?.lastName || ''}`.trim(),
    customerEmail: o.customerEmail || o.email || o.user?.email || 'N/A',
    total: o.grandTotal || o.total || 0,
    placedAt: o.placedAt ? new Date(o.placedAt) : new Date(o.createdAt || Date.now()),
    paymentStatus: o.paymentStatus || (o.paymentMethod === 'cod' ? 'pending' : 'paid'),
  }))

  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Orders</h2>
            <p className='text-muted-foreground'>
              {formatCurrency(revenue)} earned across {orders.length} orders from your website.
            </p>
          </div>
          <Button
            variant='outline'
            onClick={() => toast.success('Orders exported to CSV.')}
          >
            <Download /> Export
          </Button>
        </div>

        <StatCards stats={stats} />

        {loading && orders.length === 0 ? (
          <div className="py-12 text-center text-sm font-medium text-muted-foreground">
            Loading orders from database...
          </div>
        ) : (
          <DataTable
            columns={ordersColumns}
            data={normalizedOrders}
            initialSorting={[{ id: 'placedAt', desc: true }]}
            searchPlaceholder='Search order no, customer or tracking...'
            emptyMessage='No orders found.'
            onSearch={(order, term) =>
              (order.orderNumber || '').toLowerCase().includes(term) ||
              (order.customerName || '').toLowerCase().includes(term) ||
              (order.customerEmail || '').toLowerCase().includes(term) ||
              (order.trackingNumber || '').toLowerCase().includes(term)
            }
            filters={[
              { columnId: 'status', title: 'Status', options: orderStatuses },
              {
                columnId: 'paymentStatus',
                title: 'Payment',
                options: paymentStatuses,
              },
              {
                columnId: 'paymentMethod',
                title: 'Method',
                options: paymentMethods,
              },
            ]}
            bulkActions={(table) => <OrdersBulkActions table={table} />}
          />
        )}
      </Main>
    </>
  )
}
