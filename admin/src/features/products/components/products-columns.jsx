import { Link } from 'react-router-dom'
import { formatCurrency } from '@/config/brand'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/components/data-table'
import { LongText } from '@/components/long-text'
import { ProductImage } from '@/components/product-image'
import {
  categoryLabels,
  colorHex,
  LOW_STOCK_THRESHOLD,
  productStatusLabels,
  productStatusStyles,
} from '../products-data'
import { ProductsRowActions } from './products-row-actions'
export const productsColumns = [
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
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Product' />
    ),
    cell: ({ row }) => {
      const product = row.original
      return (
        <Link
          to={`/products/${product.id}`}
          className='flex items-center gap-3 hover:underline'
        >
          <ProductImage
            src={product.image}
            alt={product.name}
            className='size-10'
          />
          <div className='min-w-0'>
            <LongText className='max-w-52 font-medium'>{product.name}</LongText>
            <div className='truncate text-xs text-muted-foreground'>
              {product.sku}
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
    accessorKey: 'category',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Category' />
    ),
    cell: ({ row }) => (
      <div className='text-nowrap'>
        {categoryLabels.get(row.original.category) ?? row.original.category}
      </div>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
  },
  {
    accessorKey: 'gender',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='For' />
    ),
    cell: ({ row }) => (
      <div className='capitalize'>{row.getValue('gender')}</div>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Price' />
    ),
    cell: ({ row }) => {
      const { price, compareAtPrice } = row.original
      return (
        <div className='text-nowrap'>
          <span className='font-medium'>{formatCurrency(price)}</span>
          {compareAtPrice ? (
            <span className='ms-2 text-xs text-muted-foreground line-through'>
              {formatCurrency(compareAtPrice)}
            </span>
          ) : null}
        </div>
      )
    },
  },
  {
    accessorKey: 'totalStock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Stock' />
    ),
    cell: ({ row }) => {
      const stock = row.original.totalStock
      const isOut = stock === 0
      const isLow = !isOut && stock <= LOW_STOCK_THRESHOLD
      return (
        <div className='flex items-center gap-2 text-nowrap'>
          <span
            className={cn(
              'font-medium',
              isOut && 'text-destructive',
              isLow && 'text-amber-600 dark:text-amber-400'
            )}
          >
            {stock}
          </span>
          {isOut ? (
            <span className='text-xs text-muted-foreground'>Out</span>
          ) : isLow ? (
            <span className='text-xs text-muted-foreground'>Low</span>
          ) : null}
        </div>
      )
    },
  },
  {
    id: 'colors',
    accessorFn: (row) => row.colors,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Colours' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-1'>
        {row.original.colors.map((color) => (
          <span
            key={color}
            title={color}
            className='size-4 rounded-full border shadow-sm'
            style={{
              backgroundColor: colorHex.get(color) ?? '#d4d4d8',
            }}
          />
        ))}
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'sold',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Sold' />
    ),
    cell: ({ row }) => <div>{row.getValue('sold')}</div>,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge
          variant='outline'
          className={cn('text-nowrap', productStatusStyles.get(status))}
        >
          {productStatusLabels.get(status) ?? status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    cell: ProductsRowActions,
  },
]
