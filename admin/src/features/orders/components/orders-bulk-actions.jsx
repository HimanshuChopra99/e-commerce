import { CircleCheckBig, Download, Printer, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
export function OrdersBulkActions({ table }) {
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const count = selectedRows.length
  const plural = count > 1 ? 's' : ''
  const run = (loading, done) => {
    toast.promise(sleep(1200), {
      loading,
      success: () => {
        table.resetRowSelection()
        return done
      },
      error: 'Something went wrong.',
    })
  }
  return (
    <BulkActionsToolbar table={table} entityName='order'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Mark selected as shipped'
            title='Mark as shipped'
            onClick={() =>
              run(
                'Marking as shipped...',
                `${count} order${plural} marked as shipped.`
              )
            }
          >
            <Truck />
            <span className='sr-only'>Mark as shipped</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Mark as shipped</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Mark selected as delivered'
            title='Mark as delivered'
            onClick={() =>
              run(
                'Marking as delivered...',
                `${count} order${plural} marked as delivered.`
              )
            }
          >
            <CircleCheckBig />
            <span className='sr-only'>Mark as delivered</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Mark as delivered</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Print packing slips'
            title='Print packing slips'
            onClick={() =>
              run(
                'Preparing packing slips...',
                `${count} packing slip${plural} ready.`
              )
            }
          >
            <Printer />
            <span className='sr-only'>Print packing slips</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Print packing slips</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Export selected orders'
            title='Export selected orders'
            onClick={() => {
              const selected = selectedRows.map((r) => r.original)
              run(
                'Exporting orders...',
                `Exported ${selected.length} order${plural} to CSV.`
              )
            }}
          >
            <Download />
            <span className='sr-only'>Export selected orders</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Export selected</p>
        </TooltipContent>
      </Tooltip>
    </BulkActionsToolbar>
  )
}
