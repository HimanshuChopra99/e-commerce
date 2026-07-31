import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  orderStatusLabels,
  orderStatusStyles,
  paymentStatusStyles,
} from '../orders-data'
export function OrderStatusBadge({ status, className }) {
  return (
    <Badge
      variant='outline'
      className={cn('text-nowrap', orderStatusStyles.get(status), className)}
    >
      {orderStatusLabels.get(status) ?? status}
    </Badge>
  )
}
export function PaymentStatusBadge({ status, className }) {
  return (
    <Badge
      variant='outline'
      className={cn(
        'capitalize text-nowrap',
        paymentStatusStyles.get(status),
        className
      )}
    >
      {status}
    </Badge>
  )
}
