import { Link } from 'react-router-dom'
import { ArrowRight, Footprints, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { categoryGradient, categorySwatch } from '../categories-data'
/**
 * Large rectangular card for the category grid.
 * Clicking it opens the category's product list.
 */
export function CategoryCard({ category, productCount, previewImages = [] }) {
  return (
    <Link
      to={`/categories/${category.id}`}
      className='group focus-visible:outline-none'
      aria-label={`View products in ${category.name}`}
    >
      <Card
        className={cn(
          'relative h-full overflow-hidden p-0 transition-all',
          'hover:border-primary/40 hover:shadow-md',
          'group-focus-visible:ring-2 group-focus-visible:ring-ring'
        )}
      >
        {/* Cover / gradient banner */}
        <div
          className={cn(
            'relative flex h-32 items-center justify-center bg-gradient-to-br',
            categoryGradient.get(category.color)
          )}
        >
          {category.image ? (
            <img
              src={category.image}
              alt=''
              aria-hidden
              loading='lazy'
              className='h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105'
            />
          ) : (
            <Footprints className='size-10 text-foreground/25' aria-hidden />
          )}

          <Badge
            variant='secondary'
            className='absolute end-3 top-3 gap-1 backdrop-blur-sm'
          >
            <Package className='size-3' />
            {productCount}
          </Badge>
        </div>

        {/* Body */}
        <div className='flex flex-col gap-2 p-4'>
          <div className='flex items-center gap-2'>
            <span
              className={cn(
                'size-2.5 shrink-0 rounded-full',
                categorySwatch.get(category.color)
              )}
              aria-hidden
            />
            <h3 className='truncate font-semibold'>{category.name}</h3>
          </div>

          <p className='line-clamp-2 min-h-10 text-sm text-muted-foreground'>
            {category.description || 'No description yet.'}
          </p>

          <div className='mt-1 flex items-center justify-between'>
            <span className='text-sm text-muted-foreground'>
              {productCount} {productCount === 1 ? 'product' : 'products'}
            </span>
            <span className='flex items-center gap-1 text-sm font-medium text-primary'>
              View
              <ArrowRight className='size-3.5 transition-transform group-hover:translate-x-0.5' />
            </span>
          </div>

          {/* Product thumbnail preview strip */}
          {previewImages.length > 0 && (
            <div className='mt-1 flex -space-x-2'>
              {previewImages.slice(0, 4).map((src, i) => (
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt=''
                  aria-hidden
                  loading='lazy'
                  className='size-7 rounded-full border-2 border-background bg-muted object-cover'
                />
              ))}
              {productCount > 4 && (
                <span className='flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium'>
                  +{productCount - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
