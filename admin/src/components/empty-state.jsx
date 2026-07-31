import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
/** Shown when a detail page is opened with an id that doesn't exist. */
export function RecordNotFound({ title, description, backTo, backLabel }) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center'>
      <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
        <SearchX className='size-6 text-muted-foreground' />
      </div>
      <h2 className='text-xl font-semibold'>{title}</h2>
      <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
      <Button asChild className='mt-2'>
        <Link to={backTo}>{backLabel}</Link>
      </Button>
    </div>
  )
}
