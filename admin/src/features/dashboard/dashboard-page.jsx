import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  AlertTriangle,
  DollarSign,
  Download,
  Package,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchOverview } from '@/store/adminDashboardSlice'
import { brand, formatCurrency } from '@/config/brand'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProductImage } from '@/components/product-image'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Analytics } from './components/analytics'
import { Overview } from './components/overview'
import { RecentOrders } from './components/recent-orders'

export function DashboardPage() {
  const dispatch = useDispatch()
  const { overview, loading } = useSelector(
    (state) => state.adminDashboard || {}
  )

  useEffect(() => {
    dispatch(fetchOverview())
  }, [dispatch])

  const s = overview?.stats || {
    totalRevenue: 0,
    revenueChange: 0,
    totalOrders: 0,
    orders30: 0,
    ordersChange: 0,
    totalCustomers: 0,
    newCustomers30: 0,
    customersChange: 0,
    avgOrderValue: 0,
    aovChange: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    unitsSold: 0,
    returnedOrders: 0,
  }

  const lowStock = overview?.lowStock || []

  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(s.totalRevenue),
      change: s.revenueChange || 0,
      hint: 'vs previous 30 days',
      icon: DollarSign,
    },
    {
      title: 'Orders',
      value: (s.totalOrders || 0).toLocaleString(),
      change: s.ordersChange || 0,
      hint: `${s.orders30 || 0} in last 30 days`,
      icon: ShoppingCart,
    },
    {
      title: 'Customers',
      value: (s.totalCustomers || 0).toLocaleString(),
      change: s.customersChange || 0,
      hint: `${s.newCustomers30 || 0} new this month`,
      icon: Users,
    },
    {
      title: 'Avg. Order Value',
      value: formatCurrency(s.avgOrderValue),
      change: s.aovChange || 0,
      hint: 'Across all paid orders',
      icon: Package,
    },
  ]

  return (
    <>
      <Header>
        <TopNav links={topNav} className='me-auto' />
        <Search />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between gap-2 space-y-2'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
            <p className='text-sm text-muted-foreground'>
              Welcome back — here&apos;s how {brand.name} is performing.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => toast.success('Sales report exported.')}
            >
              <Download /> Export
            </Button>
            <Button asChild>
              <Link to='/products/new'>
                <Plus /> Add Product
              </Link>
            </Button>
          </div>
        </div>

        {loading && !overview ? (
          <div className='py-12 text-center text-sm font-medium text-muted-foreground'>
            Loading dashboard data from database...
          </div>
        ) : (
          <Tabs
            orientation='vertical'
            defaultValue='overview'
            className='space-y-4'
          >
            <div className='w-full overflow-x-auto pb-2'>
              <TabsList>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
                <TabsTrigger value='analytics'>Analytics</TabsTrigger>
                <TabsTrigger value='inventory'>Inventory</TabsTrigger>
              </TabsList>
            </div>

            {/* ------------------------- Overview ------------------------- */}
            <TabsContent value='overview' className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {cards.map((card) => {
                  const up = card.change >= 0
                  const TrendIcon = up ? TrendingUp : TrendingDown
                  return (
                    <Card key={card.title}>
                      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                        <CardTitle className='text-sm font-medium'>
                          {card.title}
                        </CardTitle>
                        <card.icon className='h-4 w-4 text-muted-foreground' />
                      </CardHeader>
                      <CardContent>
                        <div className='text-2xl font-bold'>{card.value}</div>
                        <p className='flex items-center gap-1 text-xs text-muted-foreground'>
                          <TrendIcon
                            className={cn(
                              'size-3',
                              up
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-destructive'
                            )}
                          />
                          <span
                            className={cn(
                              'font-medium',
                              up
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-destructive'
                            )}
                          >
                            {up ? '+' : ''}
                            {Number(card.change).toFixed(1)}%
                          </span>
                          {card.hint}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Fulfilment snapshot */}
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <QuickStat
                  label='Pending'
                  value={s.pendingOrders || 0}
                  tone='amber'
                  to='/orders'
                />
                <QuickStat
                  label='Processing'
                  value={s.processingOrders || 0}
                  tone='sky'
                  to='/orders'
                />
                <QuickStat
                  label='Shipped'
                  value={s.shippedOrders || 0}
                  tone='violet'
                  to='/orders'
                />
                <QuickStat
                  label='Low stock'
                  value={lowStock.length}
                  tone='destructive'
                  to='/products'
                />
              </div>

              <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
                <Card className='col-span-1 lg:col-span-4'>
                  <CardHeader>
                    <CardTitle>Revenue overview</CardTitle>
                    <CardDescription>
                      Monthly revenue for the last 12 months
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='ps-2'>
                    <Overview data={overview?.revenueChart} />
                  </CardContent>
                </Card>
                <Card className='col-span-1 lg:col-span-3'>
                  <CardHeader>
                    <CardTitle>Recent orders</CardTitle>
                    <CardDescription>
                      {s.orders30 || 0} orders placed in the last 30 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentOrders orders={overview?.recentOrders} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ------------------------- Analytics ------------------------ */}
            <TabsContent value='analytics' className='space-y-4'>
              <Analytics />
            </TabsContent>

            {/* ------------------------- Inventory ------------------------ */}
            <TabsContent value='inventory' className='space-y-4'>
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      Total Products
                    </CardTitle>
                    <Package className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>
                      {s.totalProducts || 0}
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      {s.activeProducts || 0} live on your site
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      Units Sold
                    </CardTitle>
                    <ShoppingCart className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{s.unitsSold || 0}</div>
                    <p className='text-xs text-muted-foreground'>All time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      Needs Restock
                    </CardTitle>
                    <AlertTriangle className='h-4 w-4 text-amber-500' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>{lowStock.length}</div>
                    <p className='text-xs text-muted-foreground'>
                      Low or out of stock
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                    <CardTitle className='text-sm font-medium'>
                      Returns
                    </CardTitle>
                    <TrendingDown className='h-4 w-4 text-muted-foreground' />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold'>
                      {s.returnedOrders || 0}
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      {s.totalOrders
                        ? (
                            ((s.returnedOrders || 0) / s.totalOrders) *
                            100
                          ).toFixed(1)
                        : 0}
                      % of all orders
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Restock list</CardTitle>
                  <CardDescription>
                    Order these in before they sell out completely
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lowStock.length === 0 ? (
                    <p className='py-6 text-center text-sm text-muted-foreground'>
                      Everything is well stocked.
                    </p>
                  ) : (
                    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                      {lowStock.slice(0, 12).map((product) => (
                        <Link
                          key={product.id || product.publicId}
                          to={`/products/${product.id || product.publicId}`}
                          className='flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted'
                        >
                          <ProductImage
                            src={
                              product.image ||
                              (product.images && product.images[0])
                            }
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
                            {(product.totalStock || 0) === 0
                              ? 'Out'
                              : `${product.totalStock} left`}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </Main>
    </>
  )
}

const toneStyles = {
  amber: 'text-amber-600 dark:text-amber-400',
  sky: 'text-sky-600 dark:text-sky-400',
  violet: 'text-violet-600 dark:text-violet-400',
  destructive: 'text-destructive',
}

function QuickStat({ label, value, tone, to }) {
  return (
    <Link to={to}>
      <Card className='transition-colors hover:bg-muted/50'>
        <CardContent className='flex items-center justify-between gap-2 py-1'>
          <span className='text-sm text-muted-foreground'>{label}</span>
          <span className={cn('text-xl font-bold', toneStyles[tone])}>
            {value}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: '/',
    isActive: true,
    disabled: false,
  },
  {
    title: 'Products',
    href: '/products',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Orders',
    href: '/orders',
    isActive: false,
    disabled: false,
  },
  {
    title: 'Customers',
    href: '/customers',
    isActive: false,
    disabled: false,
  },
]
