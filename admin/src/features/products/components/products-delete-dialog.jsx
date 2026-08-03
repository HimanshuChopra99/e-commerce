'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useCatalogStore } from '@/stores/catalog-store'
export function ProductsDeleteDialog({ open, onOpenChange, currentRow }) {
  const [value, setValue] = useState('')
  const deleteProduct = useCatalogStore((s) => s.deleteProduct)
  const handleDelete = async () => {
    if (value.trim() !== currentRow.sku) return
    try {
      await deleteProduct(currentRow.id)
      onOpenChange(false)
        toast.success(`"${currentRow.name}" has been deleted from your store.`)
    } catch (error) {
      toast.error(error.message || 'Unable to delete this product.')
    }
  }
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form='product-delete-form'
      disabled={value.trim() !== currentRow.sku}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete Product
        </span>
      }
      desc={
        <form
          id='product-delete-form'
          onSubmit={(e) => {
            e.preventDefault()
            handleDelete()
          }}
          className='space-y-4'
        >
          <p className='mb-2'>
            Are you sure you want to delete{' '}
            <span className='font-bold'>{currentRow.name}</span>?
            <br />
            This removes the product and all {currentRow.variants.length} size
            variants from your storefront. This cannot be undone.
          </p>

          <Label className='my-2 flex flex-col items-start gap-1.5'>
            <span>Confirm by typing the SKU ({currentRow.sku}):</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Enter SKU to confirm.'
              autoFocus
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Please be careful, this operation cannot be rolled back.
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText='Delete'
      destructive
    />
  )
}
