import { Link, useParams } from 'react-router-dom'
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
import { getCustomerById, getOrdersByCustomer } from '@/data/seed'
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
  const customer = getCustomerById(customerId)
  if (!customer) {
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
  const history = getOrdersByCustomer(customer.id)
  const name = `${customer.firstName} ${customer.lastName}`
  const tierMeta = customerTiers.find((t) => t.value === customer.tier)

  // Favourite products by units bought.
  const productTally = new Map()
  history
    .filter((o) => o.status !== 'cancelled')
    .forEach((order) =>
      order.items.forEach((item) => {
        const existing = productTally.get(item.productId)
        productTally.set(item.productId, {
          productId: item.productId,
          name: item.name,
          image: item.image,
          units: (existing?.units ?? 0) + item.quantity,
        })
      })
    )
  const favourites = [...productTally.values()]
    .sort((a, b) => b.units - a.units)
    .slice(0, 4)
  const stats = [
    {
      label: 'Total Orders',
      value: String(customer.totalOrders),
      icon: ShoppingBag,
    },
    {
      label: 'Total Spent',
      value: formatCurrency(customer.totalSpent),
      icon: Wallet,
    },
    {
      label: 'Avg. Order',
      value: formatCurrency(customer.avgOrderValue),
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
                  {customer.id}
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
                                {order.orderNumber}
                              </Link>
                            </TableCell>
                            <TableCell className='text-nowrap'>
                              {formatDate(order.placedAt)}
                            </TableCell>
                            <TableCell className='text-center'>
                              {order.itemCount}
                            </TableCell>
                            <TableCell>
                              <PaymentStatusBadge
                                status={order.paymentStatus}
                              />
                            </TableCell>
                            <TableCell>
                              <OrderStatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className='text-end font-medium text-nowrap'>
                              {formatCurrency(order.total)}
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
                    {customer.shippingAddress.zip},{' '}
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
