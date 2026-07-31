import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Package,
  Pencil,
  ShoppingCart,
  Star,
  TrendingUp,
} from 'lucide-react'
import { orders } from '@/data/seed'
import { useCatalogStore } from '@/stores/catalog-store'
import { formatCurrency, formatDate } from '@/config/brand'
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
import { OrderStatusBadge } from '@/features/orders/components/order-status-badge'
import {
  colorHex,
  LOW_STOCK_THRESHOLD,
  productStatusLabels,
  productStatusStyles,
} from './products-data'
import { RecordNotFound } from '@/components/empty-state'
export function ProductDetailPage() {
  const { productId } = useParams()
  const product = useCatalogStore((s) =>
    s.products.find((p) => p.id === productId)
  )
  const categories = useCatalogStore((s) => s.categories)
  const assignedCategory =
    categories.find((c) => c.id === product?.categoryId) ?? null
  if (!product) {
    return (
      <>
        <PageHeader />
        <Main className='flex flex-1 flex-col'>
          <RecordNotFound
            title='Product not found'
            description={`No product matches the id "${productId}".`}
            backTo='/products'
            backLabel='Back to Products'
          />
        </Main>
      </>
    )
  }

  // Orders that include this product.
  const relatedOrders = orders
    .filter((o) => o.items.some((i) => i.productId === product.id))
    .slice(0, 8)
  const unitsSold = orders
    .filter((o) => o.status !== 'cancelled')
    .flatMap((o) => o.items)
    .filter((i) => i.productId === product.id)
    .reduce((sum, i) => sum + i.quantity, 0)
  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .flatMap((o) => o.items)
    .filter((i) => i.productId === product.id)
    .reduce((sum, i) => sum + i.quantity * i.price, 0)
  const stats = [
    {
      label: 'Units Sold',
      value: String(unitsSold),
      icon: ShoppingCart,
    },
    {
      label: 'Revenue',
      value: formatCurrency(revenue),
      icon: TrendingUp,
    },
    {
      label: 'In Stock',
      value: String(product.totalStock),
      icon: Package,
    },
    {
      label: 'Rating',
      value: `${product.rating} (${product.reviews})`,
      icon: Star,
    },
  ]
  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-6'>
        {/* Page heading */}
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <Button variant='outline' size='icon' asChild>
              <Link to='/products' aria-label='Back to products'>
                <ArrowLeft />
              </Link>
            </Button>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='text-2xl font-bold tracking-tight'>
                  {product.name}
                </h2>
                <Badge
                  variant='outline'
                  className={cn(productStatusStyles.get(product.status))}
                >
                  {productStatusLabels.get(product.status)}
                </Badge>
                {product.featured && (
                  <Badge variant='secondary'>Featured</Badge>
                )}
              </div>
              <p className='text-muted-foreground'>
                {product.sku} · Added {formatDate(product.createdAt)}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to={`/products/${product.id}/edit`}>
              <Pencil /> Edit Product
            </Link>
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
          {/* Left: media + description */}
          <div className='flex flex-col gap-6 lg:col-span-2'>
            <Card>
              <CardContent className='grid gap-4 sm:grid-cols-[minmax(0,240px)_1fr]'>
                <ProductImage
                  src={product.image}
                  alt={product.name}
                  className='aspect-square w-full'
                />
                <div className='space-y-3'>
                  <div>
                    <div className='flex items-baseline gap-2'>
                      <span className='text-3xl font-bold'>
                        {formatCurrency(product.price)}
                      </span>
                      {product.compareAtPrice ? (
                        <span className='text-muted-foreground line-through'>
                          {formatCurrency(product.compareAtPrice)}
                        </span>
                      ) : null}
                    </div>
                    {product.costPerItem ? (
                      <p className='text-xs text-muted-foreground'>
                        Cost {formatCurrency(product.costPerItem)} ·{' '}
                        {(
                          ((product.price - product.costPerItem) /
                            product.price) *
                          100
                        ).toFixed(0)}
                        % margin
                      </p>
                    ) : null}
                  </div>

                  <Separator />

                  <dl className='grid grid-cols-2 gap-y-2 text-sm'>
                    <dt className='text-muted-foreground'>Category</dt>
                    <dd>
                      {assignedCategory ? (
                        <Link
                          to={`/categories/${assignedCategory.id}`}
                          className='hover:underline'
                        >
                          {assignedCategory.name}
                        </Link>
                      ) : (
                        <span className='text-muted-foreground'>
                          Uncategorised
                        </span>
                      )}
                    </dd>
                    <dt className='text-muted-foreground'>Made for</dt>
                    <dd className='capitalize'>{product.gender}</dd>
                    <dt className='text-muted-foreground'>Material</dt>
                    <dd>{product.material ?? '—'}</dd>
                    <dt className='text-muted-foreground'>Brand</dt>
                    <dd>{product.brand}</dd>
                  </dl>

                  <Separator />

                  <div>
                    <p className='mb-1.5 text-sm text-muted-foreground'>
                      Colours
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {product.colors.map((color) => (
                        <span
                          key={color}
                          className='flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs'
                        >
                          <span
                            className='size-3 rounded-full border'
                            style={{
                              backgroundColor: colorHex.get(color) ?? '#d4d4d8',
                            }}
                          />
                          {color}
                        </span>
                      ))}
                    </div>
                  </div>

                  {product.tags.length > 0 && (
                    <div>
                      <p className='mb-1.5 text-sm text-muted-foreground'>
                        Tags
                      </p>
                      <div className='flex flex-wrap gap-1.5'>
                        {product.tags.map((tag) => (
                          <Badge key={tag} variant='secondary'>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm leading-relaxed text-muted-foreground'>
                  {product.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent orders</CardTitle>
                <CardDescription>
                  Orders that include this product.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {relatedOrders.length === 0 ? (
                  <p className='py-4 text-center text-sm text-muted-foreground'>
                    No orders yet for this product.
                  </p>
                ) : (
                  <div className='overflow-hidden rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='text-end'>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relatedOrders.map((order) => (
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
                              {order.customerName}
                            </TableCell>
                            <TableCell className='text-nowrap'>
                              {formatDate(order.placedAt)}
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
          </div>

          {/* Right: inventory by size */}
          <div className='flex flex-col gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Inventory by size</CardTitle>
                <CardDescription>
                  {product.totalStock} pairs across{' '}
                  {product.variants.filter((v) => v.stock > 0).length} sizes.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-2'>
                {product.variants.map((variant) => {
                  const isOut = variant.stock === 0
                  const isLow = !isOut && variant.stock <= 4
                  return (
                    <div
                      key={variant.size}
                      className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'
                    >
                      <span className='font-medium'>UK {variant.size}</span>
                      <span
                        className={cn(
                          isOut && 'text-muted-foreground',
                          isLow && 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {isOut ? 'Out of stock' : `${variant.stock} pairs`}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {product.totalStock <= LOW_STOCK_THRESHOLD && (
              <Card className='border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20'>
                <CardHeader>
                  <CardTitle className='text-base'>Restock soon</CardTitle>
                  <CardDescription>
                    Only {product.totalStock} pairs left across all sizes.
                    Consider raising a purchase order.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </Main>
    </>
  )
}
