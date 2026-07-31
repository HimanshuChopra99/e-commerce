import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCatalogStore } from '@/stores/catalog-store'
import { Button } from '@/components/ui/button'
import { FormControl } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categorySwatch } from '@/features/categories/categories-data'
/**
 * Category picker for the product form.
 *
 * Lists the admin's own categories. When none exist yet, the dropdown shows a
 * "Create category" call to action that takes you to the Categories page
 * instead of leaving you with an empty, dead-end menu.
 */
export function CategorySelect({ value, onChange }) {
  const categories = useCatalogStore((s) => s.categories)
  const navigate = useNavigate()
  const hasCategories = categories.length > 0
  return (
    <Select value={value} onValueChange={onChange}>
      <FormControl>
        <SelectTrigger className='w-full'>
          <SelectValue
            placeholder={
              hasCategories ? 'Select category' : 'No categories yet'
            }
          />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {hasCategories ? (
          categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <span className='flex items-center gap-2'>
                <span
                  className={cn(
                    'size-2.5 shrink-0 rounded-full',
                    categorySwatch.get(category.color)
                  )}
                  aria-hidden
                />
                {category.name}
              </span>
            </SelectItem>
          ))
        ) : (
          // Empty state: guide the user to create their first category.
          <div className='p-2 text-center'>
            <div className='mx-auto mb-2 flex size-9 items-center justify-center rounded-full bg-muted'>
              <LayoutGrid className='size-4 text-muted-foreground' />
            </div>
            <p className='mb-1 text-sm font-medium'>No categories yet</p>
            <p className='mb-3 text-xs text-muted-foreground'>
              Create one to organise your products.
            </p>
            <Button
              type='button'
              size='sm'
              className='w-full'
              onClick={() => navigate('/categories')}
            >
              <Plus className='size-3.5' /> Create category
            </Button>
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
