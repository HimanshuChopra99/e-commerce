import { cn } from '@/lib/utils'
export function Main({ fixed, className, fluid, ...props }) {
  return (
    <main
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        'px-4 py-6',
        // If layout is fixed, make the main container flex and grow
        fixed && 'flex grow flex-col overflow-hidden',
        // If layout is not fluid, set the max-width
        !fluid &&
          '@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl',
        className
      )}
      {...props}
    />
  )
}
