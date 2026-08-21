import { Link } from 'react-router-dom'
import { formatDate } from '@/config/brand'
import { cn, getDisplayNameInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import {
  deliveryPartnerStatusStyles,
  vehicleTypes,
  vehicleTypeStyles,
} from '../delivery-partners-data'
import { DeliveryPartnersRowActions } from './delivery-partners-row-actions'

export const deliveryPartnersColumns = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-0.5'
      />
    ),
    meta: {
      className: cn('inset-s-0 z-10 rounded-tl-[inherit] max-md:sticky'),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-0.5'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'fullName',
    accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Delivery Partner' />
    ),
    cell: ({ row }) => {
      const partner = row.original
      const name = `${partner.firstName} ${partner.lastName}`.trim()
      return (
        <Link
          to={`/delivery-partners/${partner.id}`}
          className='flex items-center gap-3 hover:underline'
        >
          <Avatar className='size-8'>
            <AvatarFallback className='text-xs'>
              {getDisplayNameInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <LongText className='max-w-40 font-medium'>{name}</LongText>
            <div className='truncate text-xs text-muted-foreground'>
              {partner.email}
            </div>
          </div>
        </Link>
      )
    },
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]',
        'inset-s-6 ps-0.5 max-md:sticky @4xl/content:table-cell @4xl/content:drop-shadow-none'
      ),
    },
    enableHiding: false,
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Phone' />
    ),
    cell: ({ row }) => <div className='text-nowrap'>{row.original.phone || 'N/A'}</div>,
    enableSorting: false,
  },
  {
    accessorKey: 'vehicleType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Vehicle' />
    ),
    cell: ({ row }) => {
      const vehicle = row.original.vehicleType
      const meta = vehicleTypes.find((v) => v.value === vehicle)
      return (
        <Badge
          variant='outline'
          className={cn('gap-1 capitalize', vehicleTypeStyles.get(vehicle))}
        >
          {meta?.icon && <meta.icon className='size-3' />}
          {vehicle}
        </Badge>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
  },
  {
    accessorKey: 'isOnline',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Availability' />
    ),
    cell: ({ row }) => (
      <Badge
        variant='outline'
        className={cn(
          'gap-1',
          row.original.isOnline
            ? 'bg-teal-100/40 text-teal-900 dark:text-teal-200 border-teal-300/60'
            : 'bg-neutral-300/40 border-neutral-300'
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            row.original.isOnline ? 'bg-teal-500' : 'bg-neutral-400'
          )}
          aria-hidden
        />
        {row.original.isOnline ? 'Online' : 'Offline'}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Joined' />
    ),
    cell: ({ row }) => (
      <div className='text-nowrap text-muted-foreground'>
        {formatDate(row.original.createdAt)}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => (
      <Badge
        variant='outline'
        className={cn(
          'capitalize',
          deliveryPartnerStatusStyles.get(row.original.status)
        )}
      >
        {row.original.status}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    cell: DeliveryPartnersRowActions,
  },
]
