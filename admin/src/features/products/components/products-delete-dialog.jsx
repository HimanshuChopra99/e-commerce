'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
export function ProductsDeleteDialog({ open, onOpenChange, currentRow }) {
  const [value, setValue] = useState('')
  const handleDelete = () => {
    if (value.trim() !== currentRow.sku) return
    onOpenChange(false)
    toast.success(`"${currentRow.name}" has been deleted from your store.`)
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
