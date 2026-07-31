import { useState } from 'react'
import { Archive, CheckCircle2, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { ProductsMultiDeleteDialog } from './products-multi-delete-dialog'
export function ProductsBulkActions({ table }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const handleBulkStatusChange = (status) => {
    const selected = selectedRows.map((row) => row.original)
    toast.promise(sleep(1200), {
      loading: status === 'active' ? 'Publishing...' : 'Archiving...',
      success: () => {
        table.resetRowSelection()
        return `${status === 'active' ? 'Published' : 'Archived'} ${selected.length} product${selected.length > 1 ? 's' : ''}.`
      },
      error: 'Something went wrong.',
    })
    table.resetRowSelection()
  }
  const handleBulkExport = () => {
    const selected = selectedRows.map((row) => row.original)
    toast.promise(sleep(1200), {
      loading: 'Exporting products...',
      success: () => {
        table.resetRowSelection()
        return `Exported ${selected.length} product${selected.length > 1 ? 's' : ''} to CSV.`
      },
      error: 'Error exporting products.',
    })
  }
  return (
    <>
      <BulkActionsToolbar table={table} entityName='product'>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('active')}
              className='size-8'
              aria-label='Publish selected products'
              title='Publish selected products'
            >
              <CheckCircle2 />
              <span className='sr-only'>Publish selected products</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Publish selected</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={() => handleBulkStatusChange('archived')}
              className='size-8'
              aria-label='Archive selected products'
              title='Archive selected products'
            >
              <Archive />
              <span className='sr-only'>Archive selected products</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Archive selected</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              onClick={handleBulkExport}
              className='size-8'
              aria-label='Export selected products'
              title='Export selected products'
            >
              <Download />
              <span className='sr-only'>Export selected products</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export selected</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='destructive'
              size='icon'
              onClick={() => setShowDeleteConfirm(true)}
              className='size-8'
              aria-label='Delete selected products'
              title='Delete selected products'
            >
              <Trash2 />
              <span className='sr-only'>Delete selected products</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete selected</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <ProductsMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  )
}
