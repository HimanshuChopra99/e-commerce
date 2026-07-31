import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProductForm } from './components/product-form'
export function ProductNewPage() {
  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex flex-wrap items-center gap-3'>
          <Button variant='outline' size='icon' asChild>
            <Link to='/products' aria-label='Back to products'>
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Add New Product
            </h2>
            <p className='text-muted-foreground'>
              Fill in the details below to list a new shoe on your website.
            </p>
          </div>
        </div>

        <ProductForm />
      </Main>
    </>
  )
}
