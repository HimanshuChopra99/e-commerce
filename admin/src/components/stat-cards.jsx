import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

/**
 * The row of summary cards at the top of the list pages.
 *
 * Pass an array of: { label, value, hint?, icon?, accent? }
 * `accent` is a text colour class applied to the value and icon.
 */
export function StatCards({ stats, className }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className='flex items-center justify-between gap-2 py-1'>
            <div className='min-w-0'>
              <p className='truncate text-sm text-muted-foreground'>
                {stat.label}
              </p>
              <p className={cn('text-2xl font-bold', stat.accent)}>
                {stat.value}
              </p>
              {stat.hint && (
                <p className='truncate text-xs text-muted-foreground'>
                  {stat.hint}
                </p>
              )}
            </div>
            {stat.icon && (
              <stat.icon
                className={cn(
                  'size-5 shrink-0',
                  stat.accent ?? 'text-muted-foreground'
                )}
              />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
