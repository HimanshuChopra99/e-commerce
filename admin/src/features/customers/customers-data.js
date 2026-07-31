import { Award, Gem, Medal, Star } from 'lucide-react'
export const customerStatuses = [
  {
    label: 'Active',
    value: 'active',
  },
  {
    label: 'Inactive',
    value: 'inactive',
  },
  {
    label: 'Blocked',
    value: 'blocked',
  },
]
export const customerStatusStyles = new Map([
  [
    'active',
    'bg-teal-100/40 text-teal-900 dark:text-teal-200 border-teal-300/60',
  ],
  ['inactive', 'bg-neutral-300/40 border-neutral-300'],
  [
    'blocked',
    'bg-destructive/10 dark:bg-destructive/40 text-destructive dark:text-primary border-destructive/20',
  ],
])
export const customerTiers = [
  {
    label: 'Bronze',
    value: 'bronze',
    icon: Medal,
  },
  {
    label: 'Silver',
    value: 'silver',
    icon: Star,
  },
  {
    label: 'Gold',
    value: 'gold',
    icon: Award,
  },
  {
    label: 'Platinum',
    value: 'platinum',
    icon: Gem,
  },
]
export const customerTierStyles = new Map([
  [
    'bronze',
    'bg-orange-100/50 text-orange-900 dark:text-orange-200 border-orange-300/60',
  ],
  [
    'silver',
    'bg-slate-200/50 text-slate-900 dark:text-slate-200 border-slate-300/60',
  ],
  [
    'gold',
    'bg-yellow-100/50 text-yellow-900 dark:text-yellow-200 border-yellow-400/60',
  ],
  [
    'platinum',
    'bg-violet-100/50 text-violet-900 dark:text-violet-200 border-violet-300/60',
  ],
])

/** Lifetime-spend thresholds that decide a customer's tier. */
export function tierForSpend(spend) {
  if (spend >= 2500) return 'platinum'
  if (spend >= 1200) return 'gold'
  if (spend >= 500) return 'silver'
  return 'bronze'
}
