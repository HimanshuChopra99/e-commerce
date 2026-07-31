import { Download, Mail, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { sleep } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
export function CustomersBulkActions({ table }) {
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
    <BulkActionsToolbar table={table} entityName='customer'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Email selected customers'
            title='Email selected customers'
            onClick={() =>
              run(
                'Preparing campaign...',
                `Campaign queued for ${count} customer${plural}.`
              )
            }
          >
            <Mail />
            <span className='sr-only'>Email selected customers</span>
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
            aria-label='Tag selected customers'
            title='Tag selected customers'
            onClick={() =>
              run('Tagging customers...', `Tagged ${count} customer${plural}.`)
            }
          >
            <Tag />
            <span className='sr-only'>Tag selected customers</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add tag</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            className='size-8'
            aria-label='Export selected customers'
            title='Export selected customers'
            onClick={() =>
              run('Exporting...', `Exported ${count} customer${plural} to CSV.`)
            }
          >
            <Download />
            <span className='sr-only'>Export selected customers</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Export selected</p>
        </TooltipContent>
      </Tooltip>
    </BulkActionsToolbar>
  )
}
