import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Download, Bike, UserPlus, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchAdminDeliveryPartners,
  removeAdminDeliveryPartner,
  partnerOnlineStatusUpdated,
} from '@/store/adminDeliveryPartnersSlice'
import { adminTracker } from '@/services/admin-tracker'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { StatCards } from '@/components/stat-cards'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DeliveryPartnersProvider,
  useDeliveryPartners,
} from './components/delivery-partners-provider'
import { DeliveryPartnerFormDialog } from './components/delivery-partner-form-dialog'
import { DeliveryPartnersBulkActions } from './components/delivery-partners-bulk-actions'
import { deliveryPartnersColumns } from './components/delivery-partners-columns'
import { deliveryPartnerStatuses, vehicleTypes } from './delivery-partners-data'

function DeliveryPartnersContent() {
  const dispatch = useDispatch()
  const { items: partners = [], loading } = useSelector(
    (state) => state.adminDeliveryPartners || {}
  )
  const { open, setOpen, currentRow, setCurrentRow } = useDeliveryPartners()

  useEffect(() => {
    dispatch(fetchAdminDeliveryPartners({ limit: 100 }))
  }, [dispatch])

  // Live online/offline updates pushed by the backend over the socket
  useEffect(() => {
    const socket = adminTracker.socket
    if (!socket) return

    const onOnlineStatus = (data) => {
      if (data?.partnerPublicId) {
        dispatch(
          partnerOnlineStatusUpdated({
            partnerPublicId: data.partnerPublicId,
            isOnline: data.isOnline,
          })
        )
      }
    }

    socket.on('delivery:partner_online_status', onOnlineStatus)
    return () => socket.off('delivery:partner_online_status', onOnlineStatus)
  }, [dispatch])

  const online = partners.filter((p) => p.isOnline).length
  const active = partners.filter(
    (p) => p.status === 'active' || !p.status
  ).length
  const byVehicle = (v) => partners.filter((p) => p.vehicleType === v).length

  const stats = [
    {
      label: 'Total Partners',
      value: String(partners.length),
      hint: `${active} active`,
      icon: Bike,
    },
    {
      label: 'Online Now',
      value: String(online),
      hint: online > 0 ? 'Available for delivery' : 'None on duty',
      icon: Wifi,
      accent: online > 0 ? 'text-teal-600 dark:text-teal-400' : undefined,
    },
    {
      label: 'Bike Riders',
      value: String(byVehicle('bike')),
      hint: 'On two wheels',
      icon: WifiOff,
    },
    {
      label: 'Scooter & Car',
      value: String(byVehicle('scooter') + byVehicle('car')),
      hint: 'Larger vehicles',
      icon: UserPlus,
    },
  ]

  const normalizedPartners = partners.map((p) => ({
    ...p,
    id: p.id || p.publicId,
    firstName: p.firstName || p.fullName?.split(' ')[0] || 'Partner',
    lastName: p.lastName || p.fullName?.split(' ').slice(1).join(' ') || '',
    email: p.email || 'N/A',
    phone: p.phone || 'N/A',
    vehicleType: p.vehicleType || 'bike',
    status: p.status || 'active',
    isOnline: Boolean(p.isOnline),
  }))

  const handleDelete = async () => {
    if (!currentRow) return
    try {
      await dispatch(removeAdminDeliveryPartner(currentRow.id)).unwrap()
      toast.success(
        `${currentRow.firstName} ${currentRow.lastName} has been deleted.`
      )
      setOpen('delete')
      setCurrentRow(null)
    } catch (error) {
      toast.error(error || 'Unable to delete this delivery partner.')
    }
  }

  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Delivery Partners
            </h2>
            <p className='text-muted-foreground'>
              Your delivery fleet. Click a row for full details, or register a
              new rider.
            </p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() =>
                toast.success('Delivery partner list exported to CSV.')
              }
            >
              <Download /> Export
            </Button>
            <Button onClick={() => setOpen('create')}>
              <UserPlus /> Register Partner
            </Button>
          </div>
        </div>

        <StatCards stats={stats} />

        {loading && partners.length === 0 ? (
          <div className='py-12 text-center text-sm font-medium text-muted-foreground'>
            Loading delivery partners from database...
          </div>
        ) : (
          <DataTable
            columns={deliveryPartnersColumns}
            data={normalizedPartners}
            initialSorting={[{ id: 'createdAt', desc: true }]}
            searchPlaceholder='Search name, email, phone or vehicle...'
            emptyMessage='No delivery partners found.'
            onSearch={(partner, term) =>
              `${partner.firstName} ${partner.lastName}`
                .toLowerCase()
                .includes(term) ||
              (partner.email || '').toLowerCase().includes(term) ||
              (partner.phone || '').toLowerCase().includes(term) ||
              (partner.vehicleType || '').toLowerCase().includes(term)
            }
            filters={[
              {
                columnId: 'status',
                title: 'Status',
                options: deliveryPartnerStatuses,
              },
              {
                columnId: 'vehicleType',
                title: 'Vehicle',
                options: vehicleTypes,
              },
            ]}
            bulkActions={(table) => (
              <DeliveryPartnersBulkActions table={table} />
            )}
          />
        )}
      </Main>

      <DeliveryPartnerFormDialog
        open={open === 'create' || open === 'edit'}
        onOpenChange={() => {
          setOpen(open)
          setTimeout(() => setCurrentRow(null), 300)
        }}
        currentRow={open === 'edit' ? currentRow : null}
      />
      <ConfirmDialog
        open={open === 'delete'}
        onOpenChange={() => {
          setOpen('delete')
          setTimeout(() => setCurrentRow(null), 500)
        }}
        title={`Delete "${currentRow ? `${currentRow.firstName} ${currentRow.lastName}`.trim() : ''}"?`}
        desc='This delivery partner will be permanently removed. Their past deliveries stay on record.'
        confirmText='Delete partner'
        destructive
        handleConfirm={handleDelete}
      />
    </>
  )
}

/** Delivery partners list page. */
export function DeliveryPartnersPage() {
  return (
    <DeliveryPartnersProvider>
      <DeliveryPartnersContent />
    </DeliveryPartnersProvider>
  )
}
