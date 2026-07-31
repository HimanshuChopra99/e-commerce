import { useEffect } from 'react'
import { AlertTriangle, Footprints, PackageX, TrendingUp } from 'lucide-react'
import { useCatalogStore } from '@/stores/catalog-store'
import { formatCurrency } from '@/config/brand'
import { DataTable } from '@/components/data-table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { StatCards } from '@/components/stat-cards'
import {
  LOW_STOCK_THRESHOLD,
  categories,
  genders,
  productStatuses,
} from './products-data'
import { ProductsBulkActions } from './components/products-bulk-actions'
import { ProductsDialogs } from './components/products-dialogs'
import { ProductsPrimaryButtons } from './components/products-primary-buttons'
import { ProductsProvider } from './components/products-provider'
import { productsColumns } from './components/products-columns'

/** Products list page. */
export function ProductsPage() {
  const products = useCatalogStore((s) => s.products)
  const fetchCatalog = useCatalogStore((s) => s.fetchCatalog)
  const isLoading = useCatalogStore((s) => s.isLoading)

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  const activeCount = products.filter((p) => (p.status || 'active') === 'active').length
  const outOfStock = products.filter((p) => (p.totalStock || 0) === 0).length
  const lowStock = products.filter(
    (p) => (p.totalStock || 0) > 0 && (p.totalStock || 0) <= LOW_STOCK_THRESHOLD
  ).length
  const inventoryValue = products.reduce(
    (sum, p) => sum + (p.price || 0) * (p.totalStock || 0),
    0
  )

  const stats = [
    {
      label: 'Total Products',
      value: String(products.length),
      hint: `${activeCount} active`,
      icon: Footprints,
    },
    {
      label: 'Low Stock',
      value: String(lowStock),
      hint: `≤ ${LOW_STOCK_THRESHOLD} units left`,
      icon: AlertTriangle,
      accent: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Out of Stock',
      value: String(outOfStock),
      hint: 'Needs restocking',
      icon: PackageX,
      accent: 'text-destructive',
    },
    {
      label: 'Inventory Value',
      value: formatCurrency(inventoryValue),
      hint: 'At retail price',
      icon: TrendingUp,
    },
  ]

  const normalizedProducts = products.map((p) => ({
    ...p,
    id: p.id || p.publicId,
    sku: p.sku || p.id || 'N/A',
    status: p.status || 'active',
    tags: p.tags || [p.gender, p.category?.name].filter(Boolean),
    totalStock: p.totalStock !== undefined ? p.totalStock : 20,
  }))

  return (
    <ProductsProvider>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Products</h2>
            <p className='text-muted-foreground'>
              Manage the shoes listed on your storefront.
            </p>
          </div>
          <ProductsPrimaryButtons />
        </div>

        <StatCards stats={stats} />

        {isLoading && products.length === 0 ? (
          <div className="py-12 text-center text-sm font-medium text-muted-foreground">
            Loading products from database...
          </div>
        ) : (
          <DataTable
            columns={productsColumns}
            data={normalizedProducts}
            initialSorting={[{ id: 'name', desc: false }]}
            searchPlaceholder='Search by name, SKU or tag...'
            emptyMessage='No products found.'
            onSearch={(product, term) =>
              (product.name || '').toLowerCase().includes(term) ||
              (product.sku || '').toLowerCase().includes(term) ||
              (product.tags || []).some((t) => (t || '').toLowerCase().includes(term))
            }
            filters={[
              { columnId: 'status', title: 'Status', options: productStatuses },
              { columnId: 'category', title: 'Category', options: categories },
              { columnId: 'gender', title: 'For', options: genders },
            ]}
            bulkActions={(table) => <ProductsBulkActions table={table} />}
          />
        )}
      </Main>

      <ProductsDialogs />
    </ProductsProvider>
  )
}
