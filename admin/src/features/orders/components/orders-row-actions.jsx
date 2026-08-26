/**
 * orders-row-actions.jsx  (full replacement)
 * Place at: admin/src/features/orders/components/orders-row-actions.jsx
 */
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CircleCheckBig,
  CircleX,
  Clock,
  Copy,
  Eye,
  MoreHorizontal,
  PackageCheck,
  Printer,
  Truck,
  Undo2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateOrderStatus } from '@/store/adminOrdersSlice'
import { adminTracker } from '@/services/admin-tracker'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrderShippingDialog } from './order-shipping-dialog'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
  {
    value: 'processing',
    label: 'Processing',
    icon: PackageCheck,
    color: 'text-sky-600',
  },
  {
    value: 'ready_for_pickup',
    label: 'Ready for Pickup',
    icon: PackageCheck,
    color: 'text-orange-600',
  },
  {
    value: 'assigned',
    label: 'Assigned (Driver)',
    icon: User,
    color: 'text-blue-600',
    driverManaged: true,
  },
  {
    value: 'shipping',
    label: 'Shipping (Driver)',
    icon: Truck,
    color: 'text-violet-600',
    driverManaged: true,
  },
  {
    value: 'delivered',
    label: 'Delivered (Driver)',
    icon: CircleCheckBig,
    color: 'text-teal-600',
    driverManaged: true,
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    icon: CircleX,
    color: 'text-destructive',
  },
  {
    value: 'returned',
    label: 'Returned',
    icon: Undo2,
    color: 'text-neutral-500',
  },
]

export function OrdersRowActions({ row }) {
  const order = row.original
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [updatingStatus, setUpdatingStatus] = useState(false)

  /** Dispatches the status update. Tracking number and courier are auto-generated server-side. */
  const doStatusUpdate = async (status, extra = {}) => {
    setUpdatingStatus(true)
    try {
      const result = await dispatch(
        updateOrderStatus({ id: order.id, status, extra })
      )
      if (updateOrderStatus.fulfilled.match(result)) {
        const updated = result.payload
        const finalTracking =
          extra.trackingNumber ||
          updated?.trackingNumber ||
          updated?.tracking_number ||
          order.trackingNumber

        if (status === 'shipped' && finalTracking) {
          adminTracker.startTracking(finalTracking)
        } else if (status === 'delivered' || status === 'cancelled') {
          if (finalTracking) adminTracker.stopTracking(finalTracking)
        }

        const label =
          STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status
        toast.success(`Order ${order.orderNumber} marked as "${label}".`)
      } else {
        toast.error(result.payload || 'Failed to update status.')
      }
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const onStatusSelect = (status) => {
    if (order.status === status) {
      toast.info(`Order is already "${status}".`)
      return
    }
    doStatusUpdate(status)
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
            disabled={updatingStatus}
          >
            <MoreHorizontal className='h-4 w-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end' className='w-52'>
          <DropdownMenuLabel className='text-xs text-muted-foreground'>
            {order.orderNumber}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

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

          {/* Change Status submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className='gap-2' disabled={updatingStatus}>
              <PackageCheck className='h-4 w-4 text-muted-foreground' />
              {updatingStatus ? 'Updating…' : 'Change status'}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className='w-44'>
                {STATUS_OPTIONS.map(
                  ({ value, label, icon: Icon, color, driverManaged }) => (
                    <DropdownMenuItem
                      key={value}
                      className='gap-2'
                      disabled={
                        order.status === value ||
                        updatingStatus ||
                        driverManaged
                      }
                      onClick={() => onStatusSelect(value)}
                    >
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      {label}
                      {order.status === value && (
                        <span className='ml-auto text-xs text-muted-foreground'>
                          current
                        </span>
                      )}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

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
    </>
  )
}
