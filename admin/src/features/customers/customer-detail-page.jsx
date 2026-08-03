import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  Repeat,
  Ruler,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchAdminCustomers } from '@/store/adminCustomersSlice'
import { fetchAdminOrders } from '@/store/adminOrdersSlice' // Assumes adminOrdersSlice exists
import { customers as seedCustomers, orders as seedOrders } from '@/data/seed'
import { formatCurrency, formatDate } from '@/config/brand'
import { cn, getDisplayNameInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/features/orders/components/order-status-badge'
import {
  customerStatusStyles,
  customerTierStyles,
  customerTiers,
} from './customers-data'

export function CustomerDetailPage() {
  const { customerId } = useParams()
  const dispatch = useDispatch()

  const reduxCustomers = useSelector(
    (state) => state.adminCustomers?.items || []
  )
  const reduxOrders = useSelector(
    (state) => state.adminOrders?.items || state.orders?.items || []
  )

  // Fetch customers and orders if missing from state (e.g. direct page refresh)
  useEffect(() => {
    if (reduxCustomers.length === 0) {
      dispatch(fetchAdminCustomers({ limit: 100 }))
    }
    if (reduxOrders.length === 0 && dispatch) {
      // Safely dispatch if action exists
      try {
        dispatch(fetchAdminOrders({ limit: 100 }))
      } catch {
        // Fallback silently if slice is named differently
      }
    }
  }, [dispatch, reduxCustomers.length, reduxOrders.length])

  // 1. Search Redux store first, matching string IDs, numeric IDs, or public_id
  let rawCustomer = reduxCustomers.find(
    (c) =>
      String(c.id) === String(customerId) ||
      String(c.publicId) === String(customerId) ||
      String(c.public_id) === String(customerId)
  )

  // 2. Fallback to seed customers
  if (!rawCustomer) {
    rawCustomer = seedCustomers.find(
      (c) =>
        String(c.id) === String(customerId) ||
        String(c.publicId) === String(customerId)
    )
  }

  if (!rawCustomer) {
    return (
      <>
        <PageHeader />
        <Main className='flex flex-1 flex-col'>
          <RecordNotFound
            title='Customer not found'
            description={`No customer matches the id "${customerId}".`}
            backTo='/customers'
            backLabel='Back to Customers'
          />
        </Main>
      </>
    )
  }

  // Normalize customer properties defensively
  const customer = {
    ...rawCustomer,
    id: rawCustomer.id,
    publicId: rawCustomer.publicId || rawCustomer.public_id,
    firstName:
      rawCustomer.firstName ||
      rawCustomer.first_name ||
      rawCustomer.fullName?.split(' ')[0] ||
      'Customer',
    lastName:
      rawCustomer.lastName ||
      rawCustomer.last_name ||
      rawCustomer.fullName?.split(' ').slice(1).join(' ') ||
      '',
    email: (rawCustomer.email || '').trim().toLowerCase(),
    phone: rawCustomer.phone || 'N/A',
    status: rawCustomer.status || 'active',
    tier: rawCustomer.tier || 'bronze',
    totalOrders: rawCustomer.totalOrders ?? rawCustomer.orders_count ?? 0,
    totalSpent: Number(rawCustomer.totalSpent ?? rawCustomer.total_spent ?? 0),
    preferredSize:
      rawCustomer.preferredSize || rawCustomer.preferred_size || '42',
    shippingAddress: rawCustomer.shippingAddress || {
      line1: rawCustomer.address_line1 || '100 Main St',
      city: rawCustomer.address_city || 'New York',
      state: rawCustomer.address_state || 'NY',
      zip: rawCustomer.address_postal || '10001',
      country: rawCustomer.address_country || 'USA',
    },
  }

  const name = `${customer.firstName} ${customer.lastName}`.trim()
  const tierMeta = customerTiers.find((t) => t.value === customer.tier)

  // Combine Redux and seed orders so history is found in both development and live modes
  const allOrdersPool = reduxOrders.length > 0 ? reduxOrders : seedOrders

  // Order history lookup: matches user ID, customer ID, or customer email
  const history = allOrdersPool.filter((o) => {
    const oUserId = String(o.userId || o.user_id || '')
    const oCustId = String(o.customerId || o.customer_id || '')
    const oEmail  = (o.customerEmail || o.customer_email || o.email || '').trim().toLowerCase()

    const targetId       = String(customer.id)
    const targetPublicId = String(customer.publicId || '')

    const matchesId =
      (targetId && (oUserId === targetId || oCustId === targetId)) ||
      (targetPublicId && (oUserId === targetPublicId || oCustId === targetPublicId))

    const matchesEmail =
      customer.email && customer.email !== 'n/a' && oEmail === customer.email

    return matchesId || matchesEmail
  })

  const avgOrderValue =
    customer.avgOrderValue ??
    (history.length > 0
      ? history.reduce((sum, o) => sum + Number(o.grandTotal ?? o.total ?? o.grand_total ?? 0), 0) / history.length
      : customer.totalOrders > 0
      ? customer.totalSpent / customer.totalOrders
      : 0)

  // Favourite products by units bought
  const productTally = new Map()
  history
    .filter((o) => o.status !== 'cancelled')
    .forEach((order) =>
      (order.items || []).forEach((item) => {
        const pId = item.productId || item.product_id
        if (!pId) return
        const existing = productTally.get(pId)
        productTally.set(pId, {
          productId: pId,
          name: item.name || item.productName || item.product_name,
          image: item.image || item.productImage || item.product_image,
          units: (existing?.units ?? 0) + (Number(item.quantity) || 1),
        })
      })
    )

  const favourites = [...productTally.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 4)

  const stats = [
    {
      label: 'Total Orders',
      value: String(history.length || customer.totalOrders),
      icon: ShoppingBag,
    },
    {
      label: 'Total Spent',
      value: formatCurrency(
        history.length > 0
          ? history.reduce((sum, o) => sum + Number(o.grandTotal ?? o.total ?? o.grand_total ?? 0), 0)
          : customer.totalSpent
      ),
      icon: Wallet,
    },
    {
      label: 'Avg. Order',
      value: formatCurrency(avgOrderValue),
      icon: TrendingUp,
    },
    {
      label: 'Returns',
      value: String(history.filter((o) => o.status === 'returned').length),
      icon: Repeat,
    },
  ]

  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-6'>
        {/* Heading */}
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <Button variant='outline' size='icon' asChild>
              <Link to='/customers' aria-label='Back to customers'>
                <ArrowLeft />
              </Link>
            </Button>
            <div className='flex items-center gap-3'>
              <Avatar className='size-12'>
                <AvatarFallback>{getDisplayNameInitials(name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className='flex flex-wrap items-center gap-2'>
                  <h2 className='text-2xl font-bold tracking-tight'>{name}</h2>
                  <Badge
                    variant='outline'
                    className={cn(
                      'gap-1 capitalize',
                      customerTierStyles.get(customer.tier)
                    )}
                  >
                    {tierMeta?.icon && <tierMeta.icon className='size-3' />}
                    {customer.tier}
                  </Badge>
                  <Badge
                    variant='outline'
                    className={cn(
                      'capitalize',
                      customerStatusStyles.get(customer.status)
                    )}
                  >
                    {customer.status}
                  </Badge>
                </div>
                <p className='text-muted-foreground'>
                  Customer since {formatDate(customer.createdAt)} ·{' '}
                  {customer.publicId || customer.id}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant='outline'
            onClick={() => toast.success(`Email drafted to ${customer.email}.`)}
          >
            <Mail /> Email customer
          </Button>
        </div>

        {/* Stats */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className='flex items-center justify-between gap-2 py-1'>
                <div>
                  <p className='text-sm text-muted-foreground'>{stat.label}</p>
                  <p className='text-2xl font-bold'>{stat.value}</p>
                </div>
                <stat.icon className='size-5 text-muted-foreground' />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Order history */}
          <div className='flex flex-col gap-6 lg:col-span-2'>
            <Card>
              <CardHeader>
                <CardTitle>Order history</CardTitle>
                <CardDescription>
                  Every order {customer.firstName} has placed on your website.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className='py-8 text-center text-sm text-muted-foreground'>
                    This customer hasn&apos;t placed any orders yet.
                  </p>
                ) : (
                  <div className='overflow-hidden rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className='text-center'>Items</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='text-end'>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Link
                                to={`/orders/${order.id}`}
                                className='font-medium hover:underline'
                              >
                                {order.orderNumber || order.order_number}
                              </Link>
                            </TableCell>
                            <TableCell className='text-nowrap'>
                              {formatDate(order.placedAt || order.placed_at)}
                            </TableCell>
                            <TableCell className='text-center'>
                              {order.itemCount ?? order.items?.length ?? 1}
                            </TableCell>
                            <TableCell>
                              <PaymentStatusBadge
                                status={order.paymentStatus || order.payment_status}
                              />
                            </TableCell>
                            <TableCell>
                              <OrderStatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className='text-end font-medium text-nowrap'>
                              {formatCurrency(
                                order.grandTotal ?? order.grand_total ?? order.total
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {favourites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Most bought</CardTitle>
                  <CardDescription>
                    Products this customer keeps coming back for.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {favourites.map((fav) => (
                      <Link
                        key={fav.productId}
                        to={`/products/${fav.productId}`}
                        className='flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted'
                      >
                        <ProductImage
                          src={fav.image}
                          alt={fav.name}
                          className='size-12'
                        />
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-medium'>
                            {fav.name}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {fav.units} pair{fav.units > 1 ? 's' : ''} bought
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact + address */}
          <div className='flex flex-col gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <Mail className='size-4 shrink-0 text-muted-foreground' />
                  <span className='truncate'>{customer.email}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Phone className='size-4 shrink-0 text-muted-foreground' />
                  {customer.phone}
                </div>
                <div className='flex items-center gap-2'>
                  <Ruler className='size-4 shrink-0 text-muted-foreground' />
                  Prefers UK size {customer.preferredSize}
                </div>
                <div className='flex items-center gap-2'>
                  <CalendarDays className='size-4 shrink-0 text-muted-foreground' />
                  {customer.lastOrderAt
                    ? `Last ordered ${formatDate(customer.lastOrderAt)}`
                    : 'No orders yet'}
                </div>
                <Separator />
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Marketing email</span>
                  <Badge
                    variant={customer.marketingOptIn ? 'default' : 'secondary'}
                  >
                    {customer.marketingOptIn ? 'Subscribed' : 'Not subscribed'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex gap-2 text-sm'>
                  <MapPin className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                  <address className='not-italic text-muted-foreground'>
                    {customer.shippingAddress.line1}
                    <br />
                    {customer.shippingAddress.city},{' '}
                    {customer.shippingAddress.state}
                    <br />
                    {customer.shippingAddress.zip || customer.shippingAddress.postal},{' '}
                    {customer.shippingAddress.country}
                  </address>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loyalty</CardTitle>
                <CardDescription>
                  Tier is based on lifetime spend.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-2 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Current tier</span>
                  <Badge
                    variant='outline'
                    className={cn(
                      'gap-1 capitalize',
                      customerTierStyles.get(customer.tier)
                    )}
                  >
                    {tierMeta?.icon && <tierMeta.icon className='size-3' />}
                    {customer.tier}
                  </Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Lifetime spend</span>
                  <span className='font-semibold'>
                    {formatCurrency(customer.totalSpent)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}