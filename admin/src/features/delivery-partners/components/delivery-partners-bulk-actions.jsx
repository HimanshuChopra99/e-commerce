import { Download, Mail, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'

export function DeliveryPartnersBulkActions({ table }) {
  const count = table.getFilteredSelectedRowModel().rows.length
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
    <BulkActionsToolbar table={table} entityName='delivery partner'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Email selected delivery partners'
            title='Email selected delivery partners'
            onClick={() =>
              run(
                'Preparing campaign...',
                `Campaign queued for ${count} delivery partner${plural}.`
              )
            }
          >
            <Mail />
            <span className='sr-only'>Email selected delivery partners</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Email selected</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Block selected delivery partners'
            title='Block selected delivery partners'
            onClick={() =>
              run(
                'Blocking partners...',
                `Blocked ${count} delivery partner${plural}.`
              )
            }
          >
            <Ban />
            <span className='sr-only'>Block selected delivery partners</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Block selected</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Export selected delivery partners'
            title='Export selected delivery partners'
            onClick={() =>
              run('Exporting...', `Exported ${count} delivery partner${plural} to CSV.`)
            }
          >
            <Download />
            <span className='sr-only'>Export selected delivery partners</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Export selected</p>
        </TooltipContent>
      </Tooltip>
    </BulkActionsToolbar>
  )
}
