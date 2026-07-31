import {
  Clock,
  PackageCheck,
  Truck,
  CircleCheckBig,
  CircleX,
  Undo2,
  CreditCard,
  Smartphone,
  Wallet,
  Banknote,
  Landmark,
} from 'lucide-react'
export const orderStatuses = [
  {
    label: 'Pending',
    value: 'pending',
    icon: Clock,
  },
  {
    label: 'Processing',
    value: 'processing',
    icon: PackageCheck,
  },
  {
    label: 'Shipped',
    value: 'shipped',
    icon: Truck,
  },
  {
    label: 'Delivered',
    value: 'delivered',
    icon: CircleCheckBig,
  },
  {
    label: 'Cancelled',
    value: 'cancelled',
    icon: CircleX,
  },
  {
    label: 'Returned',
    value: 'returned',
    icon: Undo2,
  },
]
export const orderStatusStyles = new Map([
  [
    'pending',
    'bg-amber-100/50 text-amber-900 dark:text-amber-200 border-amber-300/60',
  ],
  [
    'processing',
    'bg-sky-100/50 text-sky-900 dark:text-sky-200 border-sky-300/60',
  ],
  [
    'shipped',
    'bg-violet-100/50 text-violet-900 dark:text-violet-200 border-violet-300/60',
  ],
  [
    'delivered',
    'bg-teal-100/50 text-teal-900 dark:text-teal-200 border-teal-300/60',
  ],
  [
    'cancelled',
    'bg-destructive/10 dark:bg-destructive/40 text-destructive dark:text-primary border-destructive/20',
  ],
  ['returned', 'bg-neutral-300/40 border-neutral-400/50'],
])
export const orderStatusLabels = new Map(
  orderStatuses.map((s) => [s.value, s.label])
)
export const paymentStatuses = [
  {
    label: 'Paid',
    value: 'paid',
  },
  {
    label: 'Pending',
    value: 'pending',
  },
  {
    label: 'Failed',
    value: 'failed',
  },
  {
    label: 'Refunded',
    value: 'refunded',
  },
]
export const paymentStatusStyles = new Map([
  [
    'paid',
    'bg-teal-100/50 text-teal-900 dark:text-teal-200 border-teal-300/60',
  ],
  [
    'pending',
    'bg-amber-100/50 text-amber-900 dark:text-amber-200 border-amber-300/60',
  ],
  [
    'failed',
    'bg-destructive/10 dark:bg-destructive/40 text-destructive dark:text-primary border-destructive/20',
  ],
  ['refunded', 'bg-neutral-300/40 border-neutral-400/50'],
])
export const paymentMethods = [
  {
    label: 'Card',
    value: 'card',
    icon: CreditCard,
  },
  {
    label: 'UPI',
    value: 'upi',
    icon: Smartphone,
  },
  {
    label: 'PayPal',
    value: 'paypal',
    icon: Wallet,
  },
  {
    label: 'Cash on Delivery',
    value: 'cod',
    icon: Banknote,
  },
  {
    label: 'Net Banking',
    value: 'net_banking',
    icon: Landmark,
  },
]
export const paymentMethodLabels = new Map(
  paymentMethods.map((p) => [p.value, p.label])
)
export const couriers = ['BlueDart', 'Delhivery', 'FedEx', 'DHL', 'DTDC']

/** Steps shown in the order timeline, in fulfilment order. */
export const fulfilmentSteps = ['pending', 'processing', 'shipped', 'delivered']
