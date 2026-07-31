import { Link } from 'react-router-dom'
import { formatCurrency, formatDate } from '@/config/brand'
import { cn, getDisplayNameInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import {
  customerStatusStyles,
  customerTierStyles,
  customerTiers,
} from '../customers-data'
import { CustomersRowActions } from './customers-row-actions'
export const customersColumns = [
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
      <DataTableColumnHeader column={column} title='Customer' />
    ),
    cell: ({ row }) => {
      const customer = row.original
      const name = `${customer.firstName} ${customer.lastName}`
      return (
        <Link
          to={`/customers/${customer.id}`}
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
              {customer.email}
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
    cell: ({ row }) => <div className='text-nowrap'>{row.original.phone}</div>,
    enableSorting: false,
  },
  {
    id: 'location',
    accessorFn: (row) => row.shippingAddress.city,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Location' />
    ),
    cell: ({ row }) => (
      <div className='text-nowrap'>
        {row.original.shippingAddress.city},{' '}
        <span className='text-muted-foreground'>
          {row.original.shippingAddress.state}
        </span>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'totalOrders',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Orders' />
    ),
    cell: ({ row }) => (
      <div className='font-medium'>{row.original.totalOrders}</div>
    ),
  },
  {
    accessorKey: 'totalSpent',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Total Spent' />
    ),
    cell: ({ row }) => (
      <div className='font-medium text-nowrap'>
        {formatCurrency(row.original.totalSpent)}
      </div>
    ),
  },
  {
    accessorKey: 'lastOrderAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Last Order' />
    ),
    cell: ({ row }) => (
      <div className='text-nowrap text-muted-foreground'>
        {row.original.lastOrderAt
          ? formatDate(row.original.lastOrderAt)
          : 'Never'}
      </div>
    ),
  },
  {
    accessorKey: 'tier',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Tier' />
    ),
    cell: ({ row }) => {
      const tier = row.original.tier
      const meta = customerTiers.find((t) => t.value === tier)
      return (
        <Badge
          variant='outline'
          className={cn('gap-1 capitalize', customerTierStyles.get(tier))}
        >
          {meta?.icon && <meta.icon className='size-3' />}
          {tier}
        </Badge>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
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
          customerStatusStyles.get(row.original.status)
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
    cell: CustomersRowActions,
  },
]
