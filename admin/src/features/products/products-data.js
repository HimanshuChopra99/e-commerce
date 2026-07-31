import {
  CheckCircle2,
  CircleDashed,
  Archive,
  PackageX,
  Footprints,
  Zap,
  Briefcase,
  Mountain,
  Sun,
  Trophy,
  Sparkles,
  Crown,
} from 'lucide-react'
export const productStatuses = [
  {
    label: 'Active',
    value: 'active',
    icon: CheckCircle2,
  },
  {
    label: 'Draft',
    value: 'draft',
    icon: CircleDashed,
  },
  {
    label: 'Out of Stock',
    value: 'out_of_stock',
    icon: PackageX,
  },
  {
    label: 'Archived',
    value: 'archived',
    icon: Archive,
  },
]
export const productStatusStyles = new Map([
  [
    'active',
    'bg-teal-100/40 text-teal-900 dark:text-teal-200 border-teal-300/60',
  ],
  ['draft', 'bg-neutral-300/40 border-neutral-300'],
  [
    'out_of_stock',
    'bg-amber-100/50 text-amber-900 dark:text-amber-200 border-amber-300/60',
  ],
  [
    'archived',
    'bg-destructive/10 dark:bg-destructive/40 text-destructive dark:text-primary border-destructive/20',
  ],
])
export const productStatusLabels = new Map(
  productStatuses.map((s) => [s.value, s.label])
)
export const categories = [
  {
    label: 'Sneakers',
    value: 'sneakers',
    icon: Footprints,
  },
  {
    label: 'Running',
    value: 'running',
    icon: Zap,
  },
  {
    label: 'Formal',
    value: 'formal',
    icon: Briefcase,
  },
  {
    label: 'Boots',
    value: 'boots',
    icon: Mountain,
  },
  {
    label: 'Sandals',
    value: 'sandals',
    icon: Sun,
  },
  {
    label: 'Sports',
    value: 'sports',
    icon: Trophy,
  },
  {
    label: 'Loafers',
    value: 'loafers',
    icon: Sparkles,
  },
  {
    label: 'Heels',
    value: 'heels',
    icon: Crown,
  },
]
export const categoryLabels = new Map(categories.map((c) => [c.value, c.label]))
export const genders = [
  {
    label: 'Men',
    value: 'men',
  },
  {
    label: 'Women',
    value: 'women',
  },
  {
    label: 'Unisex',
    value: 'unisex',
  },
  {
    label: 'Kids',
    value: 'kids',
  },
]

/** UK/US size run offered by the store. */
export const sizeRun = ['5', '6', '7', '8', '9', '10', '11', '12']
export const colorOptions = [
  {
    label: 'Black',
    value: 'Black',
    hex: '#111827',
  },
  {
    label: 'White',
    value: 'White',
    hex: '#f9fafb',
  },
  {
    label: 'Grey',
    value: 'Grey',
    hex: '#9ca3af',
  },
  {
    label: 'Navy',
    value: 'Navy',
    hex: '#1e3a8a',
  },
  {
    label: 'Red',
    value: 'Red',
    hex: '#dc2626',
  },
  {
    label: 'Blue',
    value: 'Blue',
    hex: '#2563eb',
  },
  {
    label: 'Green',
    value: 'Green',
    hex: '#16a34a',
  },
  {
    label: 'Brown',
    value: 'Brown',
    hex: '#78350f',
  },
  {
    label: 'Tan',
    value: 'Tan',
    hex: '#d2b48c',
  },
  {
    label: 'Beige',
    value: 'Beige',
    hex: '#e7dbc8',
  },
  {
    label: 'Pink',
    value: 'Pink',
    hex: '#ec4899',
  },
  {
    label: 'Yellow',
    value: 'Yellow',
    hex: '#eab308',
  },
]
export const colorHex = new Map(colorOptions.map((c) => [c.value, c.hex]))
export const materials = [
  'Genuine Leather',
  'Synthetic Leather',
  'Canvas',
  'Mesh',
  'Suede',
  'Knit',
  'Rubber',
  'Nubuck',
]

/** Low-stock threshold used for badges and dashboard alerts. */
export const LOW_STOCK_THRESHOLD = 12
