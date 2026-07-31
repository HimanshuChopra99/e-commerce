import { ProductsDeleteDialog } from './products-delete-dialog'
import { useProducts } from './products-provider'
export function ProductsDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useProducts()
  if (!currentRow) return null
  return (
    <ProductsDeleteDialog
      key={`product-delete-${currentRow.id}`}
      open={open === 'delete'}
      onOpenChange={() => {
        setOpen('delete')
        setTimeout(() => setCurrentRow(null), 500)
      }}
      currentRow={currentRow}
    />
  )
}
