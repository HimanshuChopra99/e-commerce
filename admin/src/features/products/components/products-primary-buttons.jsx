import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
export function ProductsPrimaryButtons() {
  return (
    <div className='flex gap-2'>
      <Button asChild className='space-x-1'>
        <Link to='/products/new'>
          <span>Add New Product</span> <Plus size={18} />
        </Link>
      </Button>
    </div>
  )
}
