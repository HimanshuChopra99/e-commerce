import { Link, useParams } from 'react-router-dom'
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
import { getOrderById } from '@/data/seed'
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
export function OrderDetailPage() {
  const { orderId } = useParams()
  const order = getOrderById(orderId)
  if (!order) {
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
  const isCancelled = order.status === 'cancelled'
  const isReturned = order.status === 'returned'
  const currentStep = fulfilmentSteps.indexOf(order.status)
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
                  : `Currently ${orderStatusLabels.get(order.status)?.toLowerCase()}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCancelled || isReturned ? (
              <div className='flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4'>
                {(() => {
                  const meta = orderStatuses.find(
                    (s) => s.value === order.status
                  )
                  const Icon = meta?.icon ?? Truck
                  return <Icon className='size-5 text-destructive' />
                })()}
                <div>
                  <p className='font-medium'>
                    {orderStatusLabels.get(order.status)}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Last updated {formatDateTime(order.updatedAt)}
                  </p>
                </div>
              </div>
            ) : (
              <ol className='grid gap-4 sm:grid-cols-4'>
                {fulfilmentSteps.map((step, idx) => {
                  const meta = orderStatuses.find((s) => s.value === step)
                  const Icon = meta?.icon ?? Truck
                  const done = idx <= currentStep
                  return (
                    <li key={step} className='flex items-start gap-3'>
                      <div
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full border',
                          done
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className='size-4' />
                      </div>
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
                          {idx === currentStep
                            ? 'Current'
                            : done
                              ? 'Completed'
                              : 'Pending'}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
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
                              to={`/products/${item.productId}`}
                              className='flex items-center gap-3 hover:underline'
                            >
                              <ProductImage
                                src={item.image}
                                alt={item.name}
                                className='size-10'
                              />
                              <div className='min-w-0'>
                                <div className='truncate font-medium'>
                                  {item.name}
                                </div>
                                <div className='truncate text-xs text-muted-foreground'>
                                  {item.sku}
                                </div>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className='text-nowrap'>
                            UK {item.size}
                          </TableCell>
                          <TableCell>{item.color}</TableCell>
                          <TableCell className='text-center'>
                            {item.quantity}
                          </TableCell>
                          <TableCell className='text-end text-nowrap'>
                            {formatCurrency(item.price)}
                          </TableCell>
                          <TableCell className='text-end font-medium text-nowrap'>
                            {formatCurrency(item.price * item.quantity)}
                          </TableCell>
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
                    <span>
                      {order.shipping === 0
                        ? 'Free'
                        : formatCurrency(order.shipping)}
                    </span>
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
                <Link
                  to={`/customers/${order.customerId}`}
                  className='flex items-center gap-2 font-medium hover:underline'
                >
                  <User className='size-4 text-muted-foreground' />
                  {order.customerName}
                </Link>
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <Mail className='size-4 shrink-0' />
                  <span className='truncate'>{order.customerEmail}</span>
                </div>
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <Phone className='size-4 shrink-0' />
                  {order.customerPhone}
                </div>
                <Separator />
                <Button variant='outline' size='sm' className='w-full' asChild>
                  <Link to={`/customers/${order.customerId}`}>
                    View customer profile
                  </Link>
                </Button>
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
                          navigator.clipboard?.writeText(
                            order.trackingNumber ?? ''
                          )
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
                    {paymentMethodLabels.get(order.paymentMethod)}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Status</span>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Amount</span>
                  <span className='font-semibold'>
                    {formatCurrency(order.total)}
                  </span>
                </div>
                {order.deliveredAt && (
                  <>
                    <Separator />
                    <div className='flex items-center justify-between'>
                      <span className='text-muted-foreground'>Delivered</span>
                      <Badge variant='secondary'>
                        {formatDateTime(order.deliveredAt)}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}
