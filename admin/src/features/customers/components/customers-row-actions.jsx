import { useNavigate } from 'react-router-dom'
import { Ban, Copy, Eye, Mail, ShoppingBag, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
export function CustomersRowActions({ row }) {
  const customer = row.original
  const navigate = useNavigate()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}`)}>
          View full details
          <DropdownMenuShortcut>
            <Eye size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            navigate(`/orders?filter=${encodeURIComponent(customer.email)}`)
          }
        >
          View orders
          <DropdownMenuShortcut>
            <ShoppingBag size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard?.writeText(customer.email)
            toast.success('Email copied to clipboard.')
          }}
        >
          Copy email
          <DropdownMenuShortcut>
            <Copy size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toast.success(`Email drafted to ${customer.email}.`)}
        >
          Send email
          <DropdownMenuShortcut>
            <Mail size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant='destructive'
          onClick={() =>
            toast.warning(
              `${customer.firstName} ${customer.lastName} has been blocked.`
            )
          }
        >
          Block customer
          <DropdownMenuShortcut>
            <Ban size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
