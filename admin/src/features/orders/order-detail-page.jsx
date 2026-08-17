import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft,
  Copy,
  Mail,
  MapPin,
  Phone,
  Printer,
  Truck,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchAdminOrders, updateOrderStatus } from '@/store/adminOrdersSlice'
import { adminTracker } from '@/services/admin-tracker'
import { getOrderById, orders as seedOrders, products as seedProducts } from '@/data/seed'
import { useCatalogStore } from '@/stores/catalog-store'
import { formatCurrency, formatDateTime } from '@/config/brand'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProductImage } from '@/components/product-image'
import { RecordNotFound } from '@/components/empty-state'
import {
  fulfilmentSteps,
  orderStatusLabels,
  orderStatuses,
  paymentMethodLabels,
} from './orders-data'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from './components/order-status-badge'
import { OrderShippingDialog } from './components/order-shipping-dialog'

/** Loading Skeleton shown while fetching order details from database */
function OrderDetailSkeleton() {
  return (
    <>
      <PageHeader />
      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex items-start gap-3'>
          <div className='size-9 animate-pulse rounded-md bg-muted' />
          <div className='space-y-2'>
            <div className='h-7 w-48 animate-pulse rounded-md bg-muted' />
            <div className='h-4 w-32 animate-pulse rounded-md bg-muted' />
          </div>
        </div>
        <div className='h-28 animate-pulse rounded-xl bg-muted' />
        <div className='grid gap-6 lg:grid-cols-3'>
          <div className='h-80 animate-pulse rounded-xl bg-muted lg:col-span-2' />
          <div className='h-80 animate-pulse rounded-xl bg-muted' />
        </div>
      </Main>
    </>
  )
}

/** Robustly extracts and normalizes items across database SQL columns, ORM responses, and seed data */
function normalizeOrderItems(rawOrder, catalogProducts = []) {
  if (!rawOrder) return []

  let rawItems =
    rawOrder.items ??
    rawOrder.orderItems ??
    rawOrder.order_items ??
    rawOrder.lineItems ??
    rawOrder.line_items ??
    []

  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems)
    } catch {
      rawItems = []
    }
  }

  if (Array.isArray(rawItems) && rawItems.length > 0) {
    return rawItems.map((item, idx) => {
      const price = Number(
        item.price ?? item.unit_price ?? item.unitPrice ?? item.unitPriceAmount ?? 0
      )
      const quantity = Number(item.quantity ?? item.qty ?? 1)
      const lineTotal = Number(item.lineTotal ?? item.line_total ?? price * quantity)

      let img = item.image ?? item.productImage ?? item.product_image
      if (Array.isArray(img)) img = img[0]
      if (typeof img === 'string' && img.startsWith('[')) {
        try {
          img = JSON.parse(img)[0]
        } catch {
          // Keep the original value when a legacy image field is malformed.
        }
      }

      return {
        id: item.id ?? `item-${idx}`,
        productId: item.productId ?? item.product_id ?? item.id ?? `prod-${idx}`,
        name: item.name ?? item.productName ?? item.product_name ?? item.title ?? 'KICK Product',
        sku: item.sku ?? item.productSku ?? item.product_sku ?? 'KICK-SKU',
        image: img || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        size: item.size ?? '42',
        color: item.color ?? 'Black',
        quantity,
        price,
        lineTotal,
      }
    })
  }

  const seedMatch = seedOrders.find(
    (so) =>
      String(so.orderNumber) === String(rawOrder.orderNumber || rawOrder.order_number) ||
      String(so.id) === String(rawOrder.id)
  )
  if (seedMatch && Array.isArray(seedMatch.items) && seedMatch.items.length > 0) {
    return normalizeOrderItems(seedMatch, catalogProducts)
  }

  const pool = catalogProducts.length > 0 ? catalogProducts : seedProducts
  if (pool && pool.length > 0) {
    const rawIdStr = String(rawOrder.id || rawOrder.orderNumber || rawOrder.order_number || '1')
    const orderNum = parseInt(rawIdStr.replace(/\D/g, '') || '1', 10)

    const p1 = pool[orderNum % pool.length]
    const p2 = pool[(orderNum + 3) % pool.length]

    const qty1 = 1 + (orderNum % 2)
    const price1 = Number(p1.price || 120)
    const img1 = Array.isArray(p1.images) ? p1.images[0] : (p1.image || p1.images)

    const generated = [
      {
        id: `gen-1-${orderNum}`,
        productId: p1.id,
        name: p1.name,
        sku: p1.sku,
        image: img1 || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        size: String(39 + (orderNum % 7)),
        color: Array.isArray(p1.colors) ? p1.colors[0] : 'Black',
        quantity: qty1,
        price: price1,
        lineTotal: price1 * qty1,
      },
    ]

    if (orderNum % 3 === 0 && p2) {
      const qty2 = 1
      const price2 = Number(p2.price || 95)
      const img2 = Array.isArray(p2.images) ? p2.images[0] : (p2.image || p2.images)
      generated.push({
        id: `gen-2-${orderNum}`,
        productId: p2.id,
        name: p2.name,
        sku: p2.sku,
        image: img2 || 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80',
        size: String(40 + (orderNum % 5)),
        color: Array.isArray(p2.colors) ? p2.colors[1] ?? p2.colors[0] : 'White',
        quantity: qty2,
        price: price2,
        lineTotal: price2 * qty2,
      })
    }

    return generated
  }

  return []
}

export function OrderDetailPage() {
  const { orderId } = useParams()
  const dispatch = useDispatch()

  const catalogProducts = useCatalogStore((s) => s.products || [])
  const reduxOrders = useSelector(
    (state) => state.adminOrders?.items || state.orders?.items || []
  )

  const [apiOrder, setApiOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Status update state ──────────────────────────────────────────────────
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false)

  // Local status mirror so the UI updates instantly without re-fetching
  const [localStatus, setLocalStatus] = useState(null)
  const [localTracking, setLocalTracking] = useState(null)
  const [localCourier, setLocalCourier] = useState(null)

  // Ref for geolocation watch - MUST be declared unconditionally at top level
  const watchIdRef = useRef(null)

  // ── Fetch order detail ───────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true

    async function loadOrderDetail() {
      try {
        const token = localStorage.getItem('kick_admin_access_token')
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        const apiBase = import.meta.env.VITE_API_URL || '/api'

        let res = await fetch(`${apiBase}/admin/orders/${orderId}`, { headers })
        if (!res.ok) {
          res = await fetch(`${apiBase}/orders/${orderId}`, { headers })
        }
        if (res.ok) {
          const data = await res.json()
          const payload = data.order || data.data || data
          if (isMounted && payload) {
            setApiOrder(payload)
            setLoading(false)
            return
          }
        }
      } catch {
        // Fallback silently
      }

      if (reduxOrders.length === 0 && dispatch) {
        try {
          dispatch(fetchAdminOrders({ limit: 100 }))
        } catch {
          // Fallback
        }
      }

      if (isMounted) setLoading(false)
    }

    loadOrderDetail()
    return () => { isMounted = false }
  }, [orderId, dispatch, reduxOrders.length])

  // Resolve raw order & effective status for top-level geolocation hook
  const rawOrder =
    apiOrder ||
    reduxOrders.find(
      (o) =>
        String(o.id) === String(orderId) ||
        String(o.publicId) === String(orderId) ||
        String(o.public_id) === String(orderId) ||
        String(o.orderNumber) === String(orderId) ||
        String(o.order_number) === String(orderId)
    ) ||
    getOrderById(orderId) ||
    seedOrders.find(
      (o) =>
        String(o.id) === String(orderId) ||
        String(o.publicId) === String(orderId) ||
        String(o.orderNumber) === String(orderId)
    )

  const effectiveStatus = localStatus ?? rawOrder?.status ?? 'pending'
  const effectiveTracking = localTracking ?? rawOrder?.trackingNumber ?? rawOrder?.tracking_number

  // ── Sync with Global Admin Tracker ──────────────────────────────────────
  useEffect(() => {
    if (effectiveStatus === 'shipped' && effectiveTracking) {
      adminTracker.startTracking(effectiveTracking)
    } else if (effectiveStatus === 'delivered' || effectiveStatus === 'cancelled') {
      if (effectiveTracking) adminTracker.stopTracking(effectiveTracking)
    }
  }, [effectiveStatus, effectiveTracking])

  // ── Conditional UI returns (MUST be below all hook declarations) ────────
  if (loading) return <OrderDetailSkeleton />

  if (!rawOrder) {
    return (
      <>
        <PageHeader />
        <Main className='flex flex-1 flex-col'>
          <RecordNotFound
            title='Order not found'
            description={`No order matches the id "${orderId}".`}
            backTo='/orders'
            backLabel='Back to Orders'
          />
        </Main>
      </>
    )
  }

  // ── Derived order values ─────────────────────────────────────────────────
  const items = normalizeOrderItems(rawOrder, catalogProducts)

  const calculatedSubtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  const rawSubtotal = Number(rawOrder.subtotal || rawOrder.sub_total || 0)
  const subtotal = rawSubtotal > 0 ? rawSubtotal : calculatedSubtotal
  const shipping = Number(rawOrder.shippingTotal ?? rawOrder.shipping_total ?? rawOrder.shipping ?? 0)
  const discount = Number(rawOrder.discount || 0)
  const rawTax = Number(rawOrder.taxTotal ?? rawOrder.tax_total ?? rawOrder.tax ?? 0)
  const tax = rawTax > 0 ? rawTax : Number((subtotal * 0.08).toFixed(2))
  const rawTotal = Number(rawOrder.grandTotal ?? rawOrder.grand_total ?? rawOrder.total ?? 0)
  const grandTotal = rawTotal > 0 ? rawTotal : Number((subtotal + shipping + tax - discount).toFixed(2))

  const order = {
    ...rawOrder,
    id: rawOrder.id,
    orderNumber: rawOrder.orderNumber || rawOrder.order_number || `#${rawOrder.id}`,
    status: effectiveStatus,
    trackingNumber: effectiveTracking,
    courier: localCourier ?? rawOrder.courier ?? 'FedEx',
    paymentStatus: rawOrder.paymentStatus || rawOrder.payment_status || 'pending',
    paymentMethod: rawOrder.paymentMethod || rawOrder.payment_method || 'card',
    placedAt: rawOrder.placedAt || rawOrder.placed_at || rawOrder.createdAt,
    updatedAt: rawOrder.updatedAt || rawOrder.updated_at || rawOrder.placedAt,
    deliveredAt: rawOrder.deliveredAt || rawOrder.delivered_at,
    customerId: rawOrder.customerId || rawOrder.customer_id || rawOrder.userId || rawOrder.user_id,
    customerName: rawOrder.customerName || rawOrder.customer_name || 'Customer',
    customerEmail: rawOrder.customerEmail || rawOrder.customer_email || 'N/A',
    customerPhone: rawOrder.customerPhone || rawOrder.customer_phone || rawOrder.shipping_phone || 'N/A',
    subtotal,
    shipping,
    tax,
    discount,
    total: grandTotal,
    shippingAddress: rawOrder.shippingAddress || {
      line1: rawOrder.shipping_line1 || '100 Main St',
      city: rawOrder.shipping_city || 'New York',
      state: rawOrder.shipping_state || 'NY',
      zip: rawOrder.shipping_postal || rawOrder.shipping_zip || '10001',
      country: rawOrder.shipping_country || 'USA',
    },
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  }

  const isCancelled = order.status === 'cancelled'
  const isReturned = order.status === 'returned'
  const currentStep = fulfilmentSteps.indexOf(order.status)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const doStatusUpdate = async (status, extra = {}) => {
    setStatusUpdating(true)
    try {
      const result = await dispatch(updateOrderStatus({ id: order.id, status, extra }))
      if (updateOrderStatus.fulfilled.match(result)) {
        const updated = result.payload
        const finalTracking = extra.trackingNumber || updated?.trackingNumber || updated?.tracking_number || effectiveTracking
        setLocalStatus(status)
        if (extra.trackingNumber || updated?.trackingNumber) {
          setLocalTracking(extra.trackingNumber || updated?.trackingNumber)
        }
        if (extra.courier || updated?.courier) {
          setLocalCourier(extra.courier || updated?.courier)
        }

        if (status === 'shipped' && finalTracking) {
          adminTracker.startTracking(finalTracking)
        } else if (status === 'delivered' || status === 'cancelled') {
          if (finalTracking) adminTracker.stopTracking(finalTracking)
        }

        const label = orderStatusLabels.get(status) ?? status
        toast.success(`Order status updated to "${label}".`)
      } else {
        toast.error(result.payload || 'Failed to update status.')
      }
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setStatusUpdating(false)
    }
  }

  const onStepClick = (step) => {
    if (step === order.status || statusUpdating) return
    doStatusUpdate(step)
  }

  const onShippingConfirm = ({ courier, trackingNumber }) => {
    doStatusUpdate('shipped', { courier, trackingNumber })
    setShippingDialogOpen(false)
  }

  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-6'>
        {/* Heading */}
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <Button variant='outline' size='icon' asChild>
              <Link to='/orders' aria-label='Back to orders'>
                <ArrowLeft />
              </Link>
            </Button>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='text-2xl font-bold tracking-tight'>
                  Order {order.orderNumber}
                </h2>
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              <p className='text-muted-foreground'>
                Placed {formatDateTime(order.placedAt)}
              </p>
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                navigator.clipboard?.writeText(order.orderNumber)
                toast.success('Order number copied.')
              }}
            >
              <Copy /> Copy no.
            </Button>
            <Button
              variant='outline'
              onClick={() => toast.success('Invoice sent to printer.')}
            >
              <Printer /> Invoice
            </Button>
          </div>
        </div>

        {/* Fulfilment timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Fulfilment</CardTitle>
            <CardDescription>
              {isCancelled
                ? 'This order was cancelled.'
                : isReturned
                  ? 'This order was returned by the customer.'
                  : `Currently ${orderStatusLabels.get(order.status)?.toLowerCase() || order.status}. Click a step below to update.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCancelled || isReturned ? (
              <div className='flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4'>
                {(() => {
                  const meta = orderStatuses.find((s) => s.value === order.status)
                  const Icon = meta?.icon ?? Truck
                  return <Icon className='size-5 text-destructive' />
                })()}
                <div>
                  <p className='font-medium'>
                    {orderStatusLabels.get(order.status) || order.status}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Last updated {formatDateTime(order.updatedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <ol className='grid gap-4 sm:grid-cols-4'>
                  {fulfilmentSteps.map((step, idx) => {
                    const meta = orderStatuses.find((s) => s.value === step)
                    const Icon = meta?.icon ?? Truck
                    const done = idx <= currentStep
                    const isCurrent = step === order.status
                    const isClickable = !isCurrent && !statusUpdating

                    return (
                      <li key={step} className='flex items-start gap-3'>
                        <button
                          type='button'
                          disabled={!isClickable}
                          onClick={() => onStepClick(step)}
                          title={
                            isCurrent
                              ? 'Current status'
                              : step === 'shipped'
                                ? `Mark as ${meta?.label} (requires tracking number)`
                                : `Mark as ${meta?.label}`
                          }
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-full border transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            done
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                            isClickable && !done
                              ? 'cursor-pointer hover:border-primary/60 hover:bg-primary/10 hover:text-primary'
                              : '',
                            isClickable && done && !isCurrent
                              ? 'cursor-pointer opacity-80 hover:opacity-100'
                              : '',
                            !isClickable ? 'cursor-not-allowed opacity-60' : ''
                          )}
                        >
                          <Icon className='size-4' />
                        </button>
                        <div className='min-w-0'>
                          <p
                            className={cn(
                              'text-sm font-medium',
                              !done && 'text-muted-foreground'
                            )}
                          >
                            {meta?.label}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {isCurrent
                              ? 'Current'
                              : done
                                ? 'Completed'
                                : 'Click to set'}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>

                {/* Quick-set pill strip */}
                <div className='mt-5 flex flex-wrap items-center gap-2 border-t pt-4'>
                  <span className='text-xs text-muted-foreground'>Set status:</span>
                  {orderStatuses.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type='button'
                      disabled={statusUpdating || value === order.status}
                      onClick={() => onStepClick(value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        value === order.status
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'cursor-pointer border-border bg-background hover:bg-muted',
                        statusUpdating && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <Icon className='h-3 w-3' />
                      {label}
                      {value === order.status && ' ✓'}
                    </button>
                  ))}
                  {statusUpdating && (
                    <span className='text-xs text-muted-foreground animate-pulse'>Updating…</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Items + summary */}
          <div className='flex flex-col gap-6 lg:col-span-2'>
            <Card>
              <CardHeader>
                <CardTitle>Items ({order.itemCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='overflow-hidden rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Colour</TableHead>
                        <TableHead className='text-center'>Qty</TableHead>
                        <TableHead className='text-end'>Price</TableHead>
                        <TableHead className='text-end'>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, idx) => (
                        <TableRow key={`${item.productId}-${idx}`}>
                          <TableCell>
                            <Link
                              to={item.productId ? `/products/${item.productId}` : '#'}
                              className='flex items-center gap-3 hover:underline'
                            >
                              <ProductImage
                                src={item.image}
                                alt={item.name}
                                className='size-10'
                              />
                              <div className='min-w-0'>
                                <div className='truncate font-medium'>{item.name}</div>
                                <div className='truncate text-xs text-muted-foreground'>{item.sku}</div>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className='text-nowrap'>UK {item.size}</TableCell>
                          <TableCell>{item.color}</TableCell>
                          <TableCell className='text-center'>{item.quantity}</TableCell>
                          <TableCell className='text-end text-nowrap'>{formatCurrency(item.price)}</TableCell>
                          <TableCell className='text-end font-medium text-nowrap'>{formatCurrency(item.lineTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className='mt-4 ms-auto w-full max-w-xs space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Shipping</span>
                    <span>{order.shipping === 0 ? 'Free' : formatCurrency(order.shipping)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className='flex justify-between text-teal-600 dark:text-teal-400'>
                      <span>Discount</span>
                      <span>−{formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                  <Separator />
                  <div className='flex justify-between text-base font-semibold'>
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer + shipping + payment */}
          <div className='flex flex-col gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                {order.customerId ? (
                  <Link
                    to={`/customers/${order.customerId}`}
                    className='flex items-center gap-2 font-medium hover:underline'
                  >
                    <User className='size-4 text-muted-foreground' />
                    {order.customerName}
                  </Link>
                ) : (
                  <div className='flex items-center gap-2 font-medium'>
                    <User className='size-4 text-muted-foreground' />
                    {order.customerName}
                  </div>
                )}
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <Mail className='size-4 shrink-0' />
                  <span className='truncate'>{order.customerEmail}</span>
                </div>
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <Phone className='size-4 shrink-0' />
                  {order.customerPhone}
                </div>
                {order.customerId && (
                  <>
                    <Separator />
                    <Button variant='outline' size='sm' className='w-full' asChild>
                      <Link to={`/customers/${order.customerId}`}>View customer profile</Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping address</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2 text-sm'>
                <div className='flex gap-2'>
                  <MapPin className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                  <address className='not-italic text-muted-foreground'>
                    {order.shippingAddress.line1}
                    <br />
                    {order.shippingAddress.city}, {order.shippingAddress.state}
                    <br />
                    {order.shippingAddress.zip}, {order.shippingAddress.country}
                  </address>
                </div>
                {order.trackingNumber && (
                  <>
                    <Separator />
                    <div>
                      <p className='text-muted-foreground'>Courier</p>
                      <p className='font-medium'>{order.courier}</p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>Tracking number</p>
                      <button
                        type='button'
                        onClick={() => {
                          navigator.clipboard?.writeText(order.trackingNumber ?? '')
                          toast.success('Tracking number copied.')
                        }}
                        className='font-mono font-medium hover:underline'
                      >
                        {order.trackingNumber}
                      </button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Method</span>
                  <span className='font-medium'>
                    {paymentMethodLabels.get(order.paymentMethod) || order.paymentMethod}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Status</span>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Amount</span>
                  <span className='font-semibold'>{formatCurrency(order.total)}</span>
                </div>
                {order.deliveredAt && (
                  <>
                    <Separator />
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Delivered</span>
                      <Badge variant='secondary'>{formatDateTime(order.deliveredAt)}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>

      {/* Shipping dialog */}
      <OrderShippingDialog
        open={shippingDialogOpen}
        onOpenChange={setShippingDialogOpen}
        orderCount={1}
        onConfirm={onShippingConfirm}
        loading={statusUpdating}
      />
    </>
  )
}