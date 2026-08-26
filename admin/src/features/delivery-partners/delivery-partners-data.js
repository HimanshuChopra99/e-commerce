import { Bike, Car, Zap } from 'lucide-react'

export const deliveryPartnerStatuses = [
  { label: 'Active', value: 'active' },
  { label: 'Blocked', value: 'blocked' },
]

export const deliveryPartnerStatusStyles = new Map([
  [
    'active',
    'bg-teal-100/40 text-teal-900 dark:text-teal-200 border-teal-300/60',
  ],
  [
    'blocked',
    'bg-destructive/10 dark:bg-destructive/40 text-destructive dark:text-primary border-destructive/20',
  ],
])

export const vehicleTypes = [
  { label: 'Bike', value: 'bike', icon: Bike },
  { label: 'Scooter', value: 'scooter', icon: Zap },
  { label: 'Car', value: 'car', icon: Car },
]

export const vehicleTypeStyles = new Map([
  ['bike', 'bg-sky-100/50 text-sky-900 dark:text-sky-200 border-sky-300/60'],
  [
    'scooter',
    'bg-emerald-100/50 text-emerald-900 dark:text-emerald-200 border-emerald-300/60',
  ],
  [
    'car',
    'bg-violet-100/50 text-violet-900 dark:text-violet-200 border-violet-300/60',
  ],
])
