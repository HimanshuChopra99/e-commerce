import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/config/brand'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProductImage } from '@/components/product-image'
import { LOW_STOCK_THRESHOLD } from '@/features/products/products-data'
import { AnalyticsChart } from './analytics-chart'

export function Analytics() {
  const { overview } = useSelector((state) => state.adminDashboard || {})

  const topProducts = overview?.topProducts || []
  const lowStock = overview?.lowStock || []

  const revenueByCategory = [
    { name: 'Running', value: 4500 },
    { name: 'Sneakers', value: 3200 },
    { name: 'Formal', value: 1800 },
    { name: 'Boots', value: 1400 },
  ]

  const ordersByStatus = [
    { name: 'Delivered', value: overview?.stats?.deliveredOrders || 0 },
    { name: 'Shipped', value: overview?.stats?.shippedOrders || 0 },
    { name: 'Processing', value: overview?.stats?.processingOrders || 0 },
    { name: 'Pending', value: overview?.stats?.pendingOrders || 0 },
  ].filter((s) => s.value > 0)

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Revenue &amp; orders</CardTitle>
          <CardDescription>
            Daily performance over the last week
          </CardDescription>
        </CardHeader>
        <CardContent className='px-6'>
          <AnalyticsChart />
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>Revenue by category</CardTitle>
            <CardDescription>Which shoe types earn the most</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarList
              items={revenueByCategory}
              barClass='bg-primary'
              valueFormatter={(n) => formatCurrency(n)}
            />
          </CardContent>
        </Card>

        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
            <CardDescription>Where your orders sit right now</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <SimpleBarList
                items={ordersByStatus}
                barClass='bg-muted-foreground'
                valueFormatter={(n) => `${n}`}
              />
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">No status breakdown available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <Card className='col-span-1 lg:col-span-4'>
          <CardHeader>
            <CardTitle>Best sellers</CardTitle>
            <CardDescription>Your top shoes by units sold</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {topProducts.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No sales data recorded yet.</p>
            ) : (
              topProducts.map((product) => (
                <Link
                  key={product.id || product.publicId}
                  to={`/products/${product.id || product.publicId}`}
                  className='flex items-center gap-3 rounded-md transition-colors hover:bg-muted'
                >
                  <ProductImage
                    src={product.image || (product.images && product.images[0])}
                    alt={product.name}
                    className='size-11'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium'>{product.name}</p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {product.sku || product.id} · {formatCurrency(product.price)}
                    </p>
                  </div>
                  <div className='text-end'>
                    <p className='text-sm font-semibold'>{product.unitsSold || product.sold || 0}</p>
                    <p className='text-xs text-muted-foreground'>sold</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className='col-span-1 lg:col-span-3'>
          <CardHeader>
            <CardTitle>Units sold by size</CardTitle>
            <CardDescription>
              Tells you which size run to restock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarList
              items={[
                { name: 'UK 39', value: 12 },
                { name: 'UK 40', value: 24 },
                { name: 'UK 41', value: 38 },
                { name: 'UK 42', value: 45 },
              ]}
              barClass='bg-primary/70'
              valueFormatter={(n) => `${n}`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <AlertTriangle className='size-4 text-amber-500' />
            Low stock alerts
          </CardTitle>
          <CardDescription>
            Products at or below {LOW_STOCK_THRESHOLD} pairs in total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStock.length === 0 ? (
            <p className='py-4 text-center text-sm text-muted-foreground'>
              Everything is well stocked. Nice work.
            </p>
          ) : (
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {lowStock.map((product) => (
                <Link
                  key={product.id || product.publicId}
                  to={`/products/${product.id || product.publicId}`}
                  className='flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted'
                >
                  <ProductImage
                    src={product.image || (product.images && product.images[0])}
                    alt={product.name}
                    className='size-10'
                  />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium'>
                      {product.name}
                    </p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {product.sku || product.id}
                    </p>
                  </div>
                  <Badge
                    variant='outline'
                    className={
                      (product.totalStock || 0) === 0
                        ? 'border-destructive/30 text-destructive'
                        : 'border-amber-300/60 text-amber-700 dark:text-amber-300'
                    }
                  >
                    {(product.totalStock || 0) === 0 ? 'Out' : product.totalStock}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SimpleBarList({ items, valueFormatter, barClass }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className='space-y-3'>
      {items.map((i) => {
        const width = `${Math.round((i.value / max) * 100)}%`
        return (
          <li key={i.name} className='flex items-center justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <div className='mb-1 truncate text-xs text-muted-foreground'>
                {i.name}
              </div>
              <div className='h-2.5 w-full rounded-full bg-muted'>
                <div
                  className={`h-2.5 rounded-full ${barClass}`}
                  style={{
                    width,
                  }}
                />
              </div>
            </div>
            <div className='ps-2 text-xs font-medium tabular-nums'>
              {valueFormatter(i.value)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
