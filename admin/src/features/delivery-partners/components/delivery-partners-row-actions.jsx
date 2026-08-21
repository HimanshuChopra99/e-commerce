import { useNavigate } from 'react-router-dom'
import { Ban, Copy, Eye, Pencil, Phone, Trash2, MoreHorizontal } from 'lucide-react'
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
import { useDeliveryPartners } from './delivery-partners-provider'

export function DeliveryPartnersRowActions({ row }) {
  const partner = row.original
  const navigate = useNavigate()
  const { setOpen, setCurrentRow } = useDeliveryPartners()

  const name = `${partner.firstName} ${partner.lastName}`.trim()

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
        <DropdownMenuItem
          onClick={() => navigate(`/delivery-partners/${partner.id}`)}
        >
          View full details
          <DropdownMenuShortcut>
            <Eye size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(partner)
            setOpen('edit')
          }}
        >
          Edit
          <DropdownMenuShortcut>
            <Pencil size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard?.writeText(partner.email)
            toast.success('Email copied to clipboard.')
          }}
        >
          Copy email
          <DropdownMenuShortcut>
            <Copy size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard?.writeText(partner.phone ?? '')
            toast.success('Phone copied to clipboard.')
          }}
        >
          Copy phone
          <DropdownMenuShortcut>
            <Phone size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant='destructive'
          onClick={() => {
            setCurrentRow(partner)
            setOpen('delete')
          }}
        >
          Delete
          <DropdownMenuShortcut>
            <Trash2 size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        {partner.status !== 'blocked' && (
          <DropdownMenuItem
            variant='destructive'
            onClick={() => toast.warning(`${name} has been blocked.`)}
          >
            Block partner
            <DropdownMenuShortcut>
              <Ban size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
