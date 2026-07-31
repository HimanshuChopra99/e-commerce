import { useNavigate } from 'react-router-dom'
import { Copy, Eye, Printer, Truck, User, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
export function OrdersRowActions({ row }) {
  const order = row.original
  const navigate = useNavigate()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem onClick={() => navigate(`/orders/${order.id}`)}>
          View order
          <DropdownMenuShortcut>
            <Eye size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate(`/customers/${order.customerId}`)}
        >
          View customer
          <DropdownMenuShortcut>
            <User size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard?.writeText(order.orderNumber)
            toast.success(`Order ${order.orderNumber} copied.`)
          }}
        >
          Copy order no.
          <DropdownMenuShortcut>
            <Copy size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!order.trackingNumber}
          onClick={() => {
            navigator.clipboard?.writeText(order.trackingNumber ?? '')
            toast.success(`Tracking ${order.trackingNumber} copied.`)
          }}
        >
          Copy tracking
          <DropdownMenuShortcut>
            <Truck size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toast.info('Invoice sent to printer.')}
        >
          Print invoice
          <DropdownMenuShortcut>
            <Printer size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
