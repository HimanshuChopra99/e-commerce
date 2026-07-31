import { useState } from 'react'
import { Footprints } from 'lucide-react'
import { cn } from '@/lib/utils'
/**
 * Product thumbnail with a graceful fallback.
 * Shows a neutral footwear icon whenever the image is missing or fails to load,
 * so a product without a photo never renders a broken image.
 */
export function ProductImage({ src, alt, className, iconClassName }) {
  const [failed, setFailed] = useState(false)
  const showFallback = !src || failed
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40',
        className
      )}
    >
      {showFallback ? (
        <Footprints
          className={cn('size-1/2 text-muted-foreground/50', iconClassName)}
          aria-hidden
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading='lazy'
          onError={() => setFailed(true)}
          className='h-full w-full object-cover'
        />
      )}
    </div>
  )
}
