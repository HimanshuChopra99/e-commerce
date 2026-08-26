import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  LayoutGrid,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/config/brand'
import { cn } from '@/lib/utils'
import { useCatalogStore } from '@/stores/catalog-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProductImage } from '@/components/product-image'
import { RecordNotFound } from '@/components/empty-state'
import {
  productStatusLabels,
  productStatusStyles,
} from '@/features/products/products-data'
import { AddProductsDialog } from './components/add-products-dialog'
import { CategoryFormDialog } from './components/category-form-dialog'
import { categoryGradient, categorySwatch } from './categories-data'
export function CategoryDetailPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const categories = useCatalogStore((s) => s.categories)
  const products = useCatalogStore((s) => s.products)
  const deleteCategory = useCatalogStore((s) => s.deleteCategory)
  const removeProductFromCategory = useCatalogStore(
    (s) => s.removeProductFromCategory
  )
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const category = categories.find((c) => c.id === categoryId) ?? null
  const inCategory = products.filter((p) => p.categoryId === categoryId)
  if (!category) {
    return (
      <>
        <PageHeader />
        <Main className='flex flex-1 flex-col'>
          <RecordNotFound
            title='Category not found'
            description={`No category matches the id "${categoryId}".`}
            backTo='/categories'
            backLabel='Back to Categories'
          />
        </Main>
      </>
    )
  }
  const totalStock = inCategory.reduce((sum, p) => sum + p.totalStock, 0)
  const totalValue = inCategory.reduce(
    (sum, p) => sum + p.price * p.totalStock,
    0
  )
  const handleDelete = async () => {
    try {
      await deleteCategory(category.id)
      setDeleteOpen(false)
      toast.success(
        `"${category.name}" deleted. Its products are now uncategorised.`
      )
      navigate('/categories')
    } catch (error) {
      toast.error(error.message || 'Unable to delete this category.')
    }
  }
  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-6'>
        {/* Heading */}
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <Button variant='outline' size='icon' asChild>
              <Link to='/categories' aria-label='Back to categories'>
                <ArrowLeft />
              </Link>
            </Button>
            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <span
                  className={cn(
                    'size-3 rounded-full',
                    categorySwatch.get(category.color)
                  )}
                  aria-hidden
                />
                <h2 className='text-2xl font-bold tracking-tight'>
                  {category.name}
                </h2>
                <Badge variant='secondary'>
                  {inCategory.length}{' '}
                  {inCategory.length === 1 ? 'product' : 'products'}
                </Badge>
              </div>
              <p className='text-muted-foreground'>
                {category.description || 'No description yet.'}
              </p>
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button
              variant='outline'
              className='text-destructive hover:text-destructive'
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 /> Delete
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Add Products
            </Button>
          </div>
        </div>

        {/* Banner + stats */}
        <div className='grid gap-4 lg:grid-cols-4'>
          <div
            className={cn(
              'relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br lg:col-span-1',
              categoryGradient.get(category.color)
            )}
          >
            {category.image ? (
              <img
                src={category.image}
                alt=''
                aria-hidden
                className='h-full w-full object-cover'
              />
            ) : (
              <LayoutGrid className='size-8 text-foreground/25' aria-hidden />
            )}
          </div>
          <Card>
            <CardContent className='flex items-center justify-between gap-2 py-1'>
              <div>
                <p className='text-sm text-muted-foreground'>Products</p>
                <p className='text-2xl font-bold'>{inCategory.length}</p>
              </div>
              <Package className='size-5 text-muted-foreground' />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='py-1'>
              <p className='text-sm text-muted-foreground'>Total stock</p>
              <p className='text-2xl font-bold'>{totalStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='py-1'>
              <p className='text-sm text-muted-foreground'>Inventory value</p>
              <p className='text-2xl font-bold'>{formatCurrency(totalValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Product list */}
        <Card>
          <CardHeader>
            <CardTitle>Products in this category</CardTitle>
            <CardDescription>
              Added {formatDate(category.createdAt)} · updated{' '}
              {formatDate(category.updatedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inCategory.length === 0 ? (
              <div className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
                <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
                  <Package className='size-6 text-muted-foreground' />
                </div>
                <h3 className='font-semibold'>No products yet</h3>
                <p className='max-w-sm text-sm text-muted-foreground'>
                  Add existing products to this category, or create a new
                  product and pick this category on the form.
                </p>
                <div className='mt-2 flex flex-wrap justify-center gap-2'>
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus /> Add Products
                  </Button>
                  <Button variant='outline' asChild>
                    <Link to='/products/new'>Create new product</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className='overflow-hidden rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='w-10' />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inCategory.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Link
                            to={`/products/${product.id}`}
                            className='flex items-center gap-3 hover:underline'
                          >
                            <ProductImage
                              src={product.image}
                              alt={product.name}
                              className='size-10'
                            />
                            <div className='min-w-0'>
                              <div className='truncate font-medium'>
                                {product.name}
                              </div>
                              <div className='truncate text-xs text-muted-foreground'>
                                {product.sku}
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className='text-nowrap'>
                          {formatCurrency(product.price)}
                        </TableCell>
                        <TableCell>{product.totalStock}</TableCell>
                        <TableCell>{product.sold}</TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={cn(
                              'text-nowrap',
                              productStatusStyles.get(product.status)
                            )}
                          >
                            {productStatusLabels.get(product.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            aria-label={`Remove ${product.name} from ${category.name}`}
                            title='Remove from category'
                            onClick={async () => {
                              try {
                                await removeProductFromCategory(
                                  category.id,
                                  product.id
                                )
                                toast.success(
                                  `"${product.name}" removed from ${category.name}.`
                                )
                              } catch (error) {
                                toast.error(
                                  error.message ||
                                    'Unable to remove this product.'
                                )
                              }
                            }}
                          >
                            <X className='size-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>

      <AddProductsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        category={category}
      />
      <CategoryFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        currentRow={category}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${category.name}"?`}
        desc={
          inCategory.length > 0
            ? `${inCategory.length} product${inCategory.length > 1 ? 's' : ''} will become uncategorised. The products themselves are not deleted.`
            : 'This category is empty and will be removed.'
        }
        confirmText='Delete category'
        destructive
        handleConfirm={handleDelete}
      />
    </>
  )
}
