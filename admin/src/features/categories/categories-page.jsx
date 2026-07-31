import { useEffect, useState } from 'react'
import { LayoutGrid, Package, Plus } from 'lucide-react'
import { selectCategoryCounts, useCatalogStore } from '@/stores/catalog-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { CategoryCard } from './components/category-card'
import { CategoryFormDialog } from './components/category-form-dialog'

export function CategoriesPage() {
  const categories = useCatalogStore((s) => s.categories)
  const products = useCatalogStore((s) => s.products)
  const fetchCatalog = useCatalogStore((s) => s.fetchCatalog)
  const isLoading = useCatalogStore((s) => s.isLoading)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  const counts = selectCategoryCounts(products)
  const uncategorised = products.filter((p) => !p.categoryId && !p.category?.id).length

  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Categories</h2>
            <p className='text-muted-foreground'>
              Group your shoes into collections shoppers can browse.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus /> Create Category
          </Button>
        </div>

        {/* Summary strip */}
        <div className='grid gap-4 sm:grid-cols-3'>
          <Card>
            <CardContent className='flex items-center justify-between gap-2 py-1'>
              <div>
                <p className='text-sm text-muted-foreground'>Categories</p>
                <p className='text-2xl font-bold'>{categories.length}</p>
              </div>
              <LayoutGrid className='size-5 text-muted-foreground' />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center justify-between gap-2 py-1'>
              <div>
                <p className='text-sm text-muted-foreground'>Categorised</p>
                <p className='text-2xl font-bold'>
                  {products.length - uncategorised}
                </p>
              </div>
              <Package className='size-5 text-muted-foreground' />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center justify-between gap-2 py-1'>
              <div>
                <p className='text-sm text-muted-foreground'>Uncategorised</p>
                <p
                  className={`text-2xl font-bold ${uncategorised > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}
                >
                  {uncategorised}
                </p>
              </div>
              <Package className='size-5 text-muted-foreground' />
            </CardContent>
          </Card>
        </div>

        {/* Grid of category cards */}
        {isLoading && categories.length === 0 ? (
          <div className="py-12 text-center text-sm font-medium text-muted-foreground">
            Loading categories from database...
          </div>
        ) : categories.length === 0 ? (
          <div className='flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center'>
            <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
              <LayoutGrid className='size-6 text-muted-foreground' />
            </div>
            <h3 className='text-lg font-semibold'>No categories yet</h3>
            <p className='max-w-sm text-sm text-muted-foreground'>
              Create your first category to start grouping your products.
            </p>
            <Button className='mt-2' onClick={() => setDialogOpen(true)}>
              <Plus /> Create Category
            </Button>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {categories.map((category) => {
              const inCategory = products.filter(
                (p) => p.categoryId === category.id || p.category?.id === category.id
              )
              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  productCount={counts.get(category.id) ?? 0}
                  previewImages={inCategory.map((p) => p.image || (p.images && p.images[0]))}
                />
              )
            })}

            {/* Create tile sits inline with the cards */}
            <button
              type='button'
              onClick={() => setDialogOpen(true)}
              className='flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            >
              <Plus className='size-8' />
              <span className='font-medium'>Create Category</span>
            </button>
          </div>
        )}
      </Main>

      <CategoryFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
