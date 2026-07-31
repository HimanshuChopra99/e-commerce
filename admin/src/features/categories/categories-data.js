/** Card gradient + accent styling per colour choice. */
export const categoryColors = [
  {
    label: 'Slate',
    value: 'slate',
    swatch: 'bg-slate-500',
    gradient: 'from-slate-500/25 to-slate-500/5',
  },
  {
    label: 'Blue',
    value: 'blue',
    swatch: 'bg-blue-500',
    gradient: 'from-blue-500/25 to-blue-500/5',
  },
  {
    label: 'Teal',
    value: 'teal',
    swatch: 'bg-teal-500',
    gradient: 'from-teal-500/25 to-teal-500/5',
  },
  {
    label: 'Amber',
    value: 'amber',
    swatch: 'bg-amber-500',
    gradient: 'from-amber-500/25 to-amber-500/5',
  },
  {
    label: 'Rose',
    value: 'rose',
    swatch: 'bg-rose-500',
    gradient: 'from-rose-500/25 to-rose-500/5',
  },
  {
    label: 'Violet',
    value: 'violet',
    swatch: 'bg-violet-500',
    gradient: 'from-violet-500/25 to-violet-500/5',
  },
]
export const categoryGradient = new Map(
  categoryColors.map((c) => [c.value, c.gradient])
)
export const categorySwatch = new Map(
  categoryColors.map((c) => [c.value, c.swatch])
)
export function slugifyCategory(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
