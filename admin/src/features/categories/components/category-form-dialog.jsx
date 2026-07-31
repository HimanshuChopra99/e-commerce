'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useCatalogStore } from '@/stores/catalog-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { categoryColors } from '../categories-data'
const formSchema = z.object({
  name: z.string().min(2, 'Category name is required.'),
  description: z.string().max(160, 'Keep it under 160 characters.'),
  color: z.string().min(1),
  image: z.string(),
})
export function CategoryFormDialog({ open, onOpenChange, currentRow }) {
  const isEdit = !!currentRow
  const addCategory = useCatalogStore((s) => s.addCategory)
  const updateCategory = useCatalogStore((s) => s.updateCategory)
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      color: 'blue',
      image: '',
    },
  })

  // Re-seed the form whenever the dialog opens for a different row.
  useEffect(() => {
    if (!open) return
    form.reset(
      currentRow
        ? {
            name: currentRow.name,
            description: currentRow.description,
            color: currentRow.color,
            image: currentRow.image ?? '',
          }
        : {
            name: '',
            description: '',
            color: 'blue',
            image: '',
          }
    )
  }, [open, currentRow, form])
  const onSubmit = (values) => {
    const payload = {
      name: values.name,
      description: values.description,
      color: values.color,
      image: values.image.trim() || null,
    }
    if (isEdit && currentRow) {
      updateCategory(currentRow.id, payload)
      toast.success(`"${values.name}" has been updated.`)
    } else {
      addCategory(payload)
      toast.success(`Category "${values.name}" created.`)
    }
    onOpenChange(false)
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedColor = form.watch('color')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>
            {isEdit ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the category details.'
              : 'Group your shoes so shoppers can browse them easily.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='category-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Running'
                      autoComplete='off'
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='What kind of shoes belong in this category?'
                      className='min-h-20 resize-y'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {field.value?.length ?? 0}/160 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='color'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card colour</FormLabel>
                  <FormControl>
                    <div className='flex flex-wrap gap-2'>
                      {categoryColors.map((c) => (
                        <button
                          key={c.value}
                          type='button'
                          onClick={() => field.onChange(c.value)}
                          aria-label={c.label}
                          aria-pressed={selectedColor === c.value}
                          className={cn(
                            'size-8 rounded-full transition-all',
                            c.swatch,
                            selectedColor === c.value
                              ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                              : 'opacity-70 hover:opacity-100'
                          )}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='image'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover image (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='/products/running-01.png'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    An image URL or a path from /public.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='category-form'>
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
