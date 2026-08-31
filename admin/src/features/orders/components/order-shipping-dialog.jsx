/**
 * order-shipping-dialog.jsx
 * Place at: admin/src/features/orders/components/order-shipping-dialog.jsx
 *
 * A modal that collects courier + tracking number before marking an order shipped.
 * Used by both orders-row-actions.jsx and orders-bulk-actions.jsx.
 */
import { useState } from 'react'
import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * @param {object} props
 * @param {boolean}  props.open          - controlled open state
 * @param {function} props.onOpenChange  - setter for open state
 * @param {number}   props.orderCount    - how many orders are being shipped (1 for single)
 * @param {function} props.onConfirm     - called with { courier, trackingNumber }
 * @param {boolean}  props.loading       - disables the confirm button while API call runs
 */
export function OrderShippingDialog({
  open,
  onOpenChange,
  orderCount = 1,
  onConfirm,
  loading,
}) {
  // FIX #2: Moved COURIERS inside the component so this file only exports
  // components — satisfying the react-refresh/only-export-components rule
  // and enabling Vite Fast Refresh to hot-swap without a full page reload.
  // COURIERS is a static array so there is zero performance cost to defining
  // it here; it is not recreated on re-render in a way that affects children.
  const COURIERS = ['BlueDart', 'Delhivery', 'FedEx', 'DHL', 'DTDC']

  const [courier, setCourier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [error, setError] = useState('')

  const plural = orderCount > 1 ? 's' : ''

  const handleConfirm = () => {
    if (!trackingNumber.trim()) {
      setError('Tracking number is required.')
      return
    }
    setError('')
    onConfirm({
      courier: courier || undefined,
      trackingNumber: trackingNumber.trim(),
    })
  }

  const handleOpenChange = (val) => {
    if (!val) {
      // reset on close
      setCourier('')
      setTrackingNumber('')
      setError('')
    }
    onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Truck className='size-5 text-violet-600' />
            Mark as Shipped
          </DialogTitle>
          <DialogDescription>
            {orderCount > 1
              ? `Enter shipping details for ${orderCount} order${plural}. The same tracking number will be applied to all selected orders.`
              : 'Enter the courier and tracking number for this shipment.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-2'>
          {/* Courier */}
          <div className='grid gap-1.5'>
            <Label htmlFor='courier'>
              Courier <span className='text-muted-foreground'>(optional)</span>
            </Label>
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger id='courier'>
                <SelectValue placeholder='Select courier…' />
              </SelectTrigger>
              <SelectContent>
                {COURIERS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tracking Number */}
          <div className='grid gap-1.5'>
            <Label htmlFor='trackingNumber'>
              Tracking Number <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='trackingNumber'
              placeholder='e.g. 1Z999AA10123456784'
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value)
                if (error) setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
              aria-invalid={!!error}
            />
            {error && <p className='text-xs text-destructive'>{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading
              ? 'Updating…'
              : `Mark ${orderCount > 1 ? `${orderCount} orders` : 'order'} as Shipped`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
