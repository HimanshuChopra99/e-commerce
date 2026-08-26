import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Download, Repeat, TrendingUp, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { fetchAdminCustomers } from '@/store/adminCustomersSlice'
import { formatCurrency } from '@/config/brand'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { StatCards } from '@/components/stat-cards'
import { customerStatuses, customerTiers } from './customers-data'
import { CustomersBulkActions } from './components/customers-bulk-actions'
import { customersColumns } from './components/customers-columns'

/** Customers list page. */
export function CustomersPage() {
  const dispatch = useDispatch()
  const { items: customers = [], loading } = useSelector(
    (state) => state.adminCustomers || {}
  )

  useEffect(() => {
    dispatch(fetchAdminCustomers({ limit: 100 }))
  }, [dispatch])

  const active = customers.filter(
    (c) => c.status === 'active' || !c.status
  ).length
  const repeat = customers.filter((c) => (c.totalOrders || 0) > 1).length
  const lifetimeValue = customers.reduce(
    (sum, c) => sum + (c.totalSpent || 0),
    0
  )
  const avgLtv = customers.length ? lifetimeValue / customers.length : 0

  const stats = [
    {
      label: 'Total Customers',
      value: String(customers.length),
      hint: `${active} active`,
      icon: Users,
    },
    {
      label: 'Repeat Buyers',
      value: String(repeat),
      hint: `${customers.length ? ((repeat / customers.length) * 100).toFixed(0) : 0}% of base`,
      icon: Repeat,
    },
    {
      label: 'Lifetime Value',
      value: formatCurrency(lifetimeValue),
      hint: 'All customers',
      icon: TrendingUp,
    },
    {
      label: 'Avg. LTV',
      value: formatCurrency(avgLtv),
      hint: 'Per customer',
      icon: UserPlus,
    },
  ]

  const normalizedCustomers = customers.map((c) => ({
    ...c,
    firstName: c.firstName || c.fullName?.split(' ')[0] || 'User',
    lastName: c.lastName || c.fullName?.split(' ').slice(1).join(' ') || '',
    email: c.email || 'N/A',
    phone: c.phone || 'N/A',
    status: c.status || 'active',
    tier: c.tier || 'bronze',
    totalOrders: c.totalOrders || 0,
    totalSpent: c.totalSpent || 0,
    shippingAddress: c.shippingAddress || { city: 'N/A' },
  }))

  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Customers</h2>
            <p className='text-muted-foreground'>
              Everyone registered on your website. Click a row for full details.
            </p>
          </div>
          <Button
            variant='outline'
            onClick={() => toast.success('Customer list exported to CSV.')}
          >
            <Download /> Export
          </Button>
        </div>

        <StatCards stats={stats} />

        {loading && customers.length === 0 ? (
          <div className='py-12 text-center text-sm font-medium text-muted-foreground'>
            Loading customers from database...
          </div>
        ) : (
          <DataTable
            columns={customersColumns}
            data={normalizedCustomers}
            initialSorting={[{ id: 'totalSpent', desc: true }]}
            searchPlaceholder='Search name, email, phone or city...'
            emptyMessage='No customers found.'
            onSearch={(customer, term) =>
              `${customer.firstName} ${customer.lastName}`
                .toLowerCase()
                .includes(term) ||
              (customer.email || '').toLowerCase().includes(term) ||
              (customer.phone || '').toLowerCase().includes(term) ||
              (customer.shippingAddress?.city || '')
                .toLowerCase()
                .includes(term)
            }
            filters={[
              {
                columnId: 'status',
                title: 'Status',
                options: customerStatuses,
              },
              { columnId: 'tier', title: 'Tier', options: customerTiers },
            ]}
            bulkActions={(table) => <CustomersBulkActions table={table} />}
          />
        )}
      </Main>
    </>
  )
}
