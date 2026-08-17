/**
 * orders-bulk-actions.jsx  (full replacement)
 * Place at: admin/src/features/orders/components/orders-bulk-actions.jsx
 */
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import {
  CircleCheckBig,
  CircleX,
  Clock,
  Download,
  PackageCheck,
  Printer,
  Truck,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { bulkUpdateOrderStatus } from '@/store/adminOrdersSlice'
import { adminTracker } from '@/services/admin-tracker'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { OrderShippingDialog } from './order-shipping-dialog'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
  { value: 'processing', label: 'Processing', icon: PackageCheck, color: 'text-sky-600' },
  { value: 'shipped', label: 'Shipped', icon: Truck, color: 'text-violet-600' },
  { value: 'delivered', label: 'Delivered', icon: CircleCheckBig, color: 'text-teal-600' },
  { value: 'cancelled', label: 'Cancelled', icon: CircleX, color: 'text-destructive' },
  { value: 'returned', label: 'Returned', icon: Undo2, color: 'text-neutral-500' },
]

export function OrdersBulkActions({ table }) {
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const count = selectedRows.length
  const plural = count > 1 ? 's' : ''

  const doBulkUpdate = async (status, extra = {}) => {
    const ids = selectedRows.map((r) => r.original.id)
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status

    setLoading(true)
    try {
      const result = await dispatch(bulkUpdateOrderStatus({ ids, status, extra }))
      if (bulkUpdateOrderStatus.fulfilled.match(result)) {
        if (status === 'shipped') {
          result.payload.forEach((o) => {
            if (o?.trackingNumber) adminTracker.startTracking(o.trackingNumber)
          })
        } else if (status === 'delivered' || status === 'cancelled') {
          selectedRows.forEach((r) => {
            if (r.original.trackingNumber) adminTracker.stopTracking(r.original.trackingNumber)
          })
        }

        table.resetRowSelection()
        toast.success(`${count} order${plural} marked as "${label}".`)
      } else {
        toast.error(result.payload || 'Failed to update order status.')
      }
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const onStatusSelect = (status) => {
    doBulkUpdate(status)
  }

  const handleExport = () => {
    const selected = selectedRows.map((r) => r.original)
    const headers = ['Order', 'Customer', 'Email', 'Total', 'Status', 'Payment', 'Date']
    const rows = selected.map((o) => [
      o.orderNumber ?? o.id,
      o.customerName ?? '',
      o.customerEmail ?? '',
      o.total ?? '',
      o.status ?? '',
      o.paymentStatus ?? '',
      o.placedAt ? new Date(o.placedAt).toLocaleDateString() : '',
    ])
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-export-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${count} order${plural} to CSV.`)
  }

  const handlePrint = () => {
    const selected = selectedRows.map((r) => r.original)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return toast.error('Pop-up blocked. Please allow pop-ups.')
    const content = selected
      .map(
        (o) => `
        <div style="border:1px solid #ccc;padding:16px;margin-bottom:16px;border-radius:6px;page-break-inside:avoid">
          <h3 style="margin:0 0 8px">${o.orderNumber ?? o.id}</h3>
          <p style="margin:2px 0"><strong>Customer:</strong> ${o.customerName ?? 'N/A'} (${o.customerEmail ?? ''})</p>
          <p style="margin:2px 0"><strong>Status:</strong> ${o.status ?? ''} | <strong>Total:</strong> $${(o.total ?? 0).toFixed(2)}</p>
          <p style="margin:2px 0"><strong>Date:</strong> ${o.placedAt ? new Date(o.placedAt).toLocaleDateString() : 'N/A'}</p>
          ${o.trackingNumber ? `<p style="margin:2px 0"><strong>Tracking:</strong> ${o.trackingNumber}</p>` : ''}
        </div>`
      )
      .join('')
    printWindow.document.write(
      `<html><head><title>Packing Slips</title></head><body><h2>Packing Slips (${count})</h2>${content}</body></html>`
    )
    printWindow.document.close()
    printWindow.print()
    toast.success(`${count} packing slip${plural} sent to printer.`)
  }

  return (
    <>
      <BulkActionsToolbar table={table} entityName='order'>
        {/* Change Status dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 gap-1.5 px-3 font-medium'
                  disabled={loading}
                >
                  <PackageCheck className='h-3.5 w-3.5' />
                  {loading ? 'Updating…' : 'Change Status'}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Change status for {count} selected order{plural}</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Set {count} order{plural} to…
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => (
              <DropdownMenuItem
                key={value}
                onClick={() => onStatusSelect(value)}
                className='gap-2'
                disabled={loading}
              >
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                {label}
                {value === 'shipped' && (
                  <span className='ml-auto text-xs text-muted-foreground'>+ tracking</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick-fire icon buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              className='size-8'
              disabled={loading}
              onClick={() => onStatusSelect('shipped')}
            >
              <Truck className='h-4 w-4' />
              <span className='sr-only'>Mark as Shipped</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Mark as Shipped</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='outline'
              size='icon'
              className='size-8'
              disabled={loading}
              onClick={() => doBulkUpdate('delivered')}
            >
              <CircleCheckBig className='h-4 w-4' />
              <span className='sr-only'>Mark as Delivered</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Mark as Delivered</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='outline' size='icon' className='size-8' disabled={loading} onClick={handlePrint}>
              <Printer className='h-4 w-4' />
              <span className='sr-only'>Print packing slips</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Print packing slips</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='outline' size='icon' className='size-8' disabled={loading} onClick={handleExport}>
              <Download className='h-4 w-4' />
              <span className='sr-only'>Export selected</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Export to CSV</p></TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>
    </>
  )
}