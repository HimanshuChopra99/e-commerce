'use client'

import { useMemo, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/config/brand'
import { cn } from '@/lib/utils'
import { useCatalogStore } from '@/stores/catalog-store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProductImage } from '@/components/product-image'
/** Pick existing products and file them into this category. */
export function AddProductsDialog({ open, onOpenChange, category }) {
  const products = useCatalogStore((s) => s.products)
  const assign = useCatalogStore((s) => s.assignProductsToCategory)
  const [selected, setSelected] = useState([])
  const [query, setQuery] = useState('')

  // Anything not already in this category is fair game.
  const available = useMemo(
    () => products.filter((p) => p.categoryId !== category.id),
    [products, category.id]
  )
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return available
    return available.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
    )
  }, [available, query])
  const toggle = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  const handleSave = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one product.')
      return
    }
    try {
      await assign(category.id, selected)
      toast.success(
        `Added ${selected.length} product${selected.length > 1 ? 's' : ''} to ${category.name}.`
      )
      setSelected([])
      setQuery('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error.message || 'Unable to assign products.')
    }
  }
  const handleOpenChange = (next) => {
    if (!next) {
      setSelected([])
      setQuery('')
    }
    onOpenChange(next)
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader className='text-start'>
          <DialogTitle>Add products to {category.name}</DialogTitle>
          <DialogDescription>
            Pick existing products to file into this category. A product belongs
            to one category at a time.
          </DialogDescription>
        </DialogHeader>

        <div className='relative'>
          <SearchIcon className='absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search by name or SKU...'
            className='ps-9'
          />
        </div>

        <ScrollArea className='h-80 rounded-md border'>
          {filtered.length === 0 ? (
            <p className='py-12 text-center text-sm text-muted-foreground'>
              {available.length === 0
                ? 'Every product is already in this category.'
                : 'No products match your search.'}
            </p>
          ) : (
            <ul className='divide-y'>
              {filtered.map((product) => {
                const checked = selected.includes(product.id)
                return (
                  <li key={product.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted',
                        checked && 'bg-muted/60'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                      <ProductImage
                        src={product.image}
                        alt={product.name}
                        className='size-10'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium'>
                          {product.name}
                        </p>
                        <p className='truncate text-xs text-muted-foreground'>
                          {product.sku} · {formatCurrency(product.price)}
                        </p>
                      </div>
                      {product.categoryId && (
                        <span className='shrink-0 text-xs text-muted-foreground'>
                          Will move
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter className='sm:justify-between'>
          <span className='text-sm text-muted-foreground'>
            {selected.length} selected
          </span>
          <div className='flex gap-2'>
            <Button variant='outline' onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={selected.length === 0}>
              Add to category
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
