import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCatalogStore } from '@/stores/catalog-store'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProductForm } from './components/product-form'
import { RecordNotFound } from '@/components/empty-state'
export function ProductEditPage() {
  const { productId } = useParams()
  const product = useCatalogStore((s) =>
    s.products.find((p) => p.id === productId)
  )
  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-6'>
        {!product ? (
          <RecordNotFound
            title='Product not found'
            description={`No product matches the id "${productId}".`}
            backTo='/products'
            backLabel='Back to Products'
          />
        ) : (
          <>
            <div className='flex flex-wrap items-center gap-3'>
              <Button variant='outline' size='icon' asChild>
                <Link
                  to={`/products/${product.id}`}
                  aria-label='Back to product'
                >
                  <ArrowLeft />
                </Link>
              </Button>
              <div>
                <h2 className='text-2xl font-bold tracking-tight'>
                  Edit Product
                </h2>
                <p className='text-muted-foreground'>
                  Updating{' '}
                  <span className='font-medium text-foreground'>
                    {product.name}
                  </span>{' '}
                  · {product.sku}
                </p>
              </div>
            </div>

            <ProductForm currentRow={product} />
          </>
        )}
      </Main>
    </>
  )
}
