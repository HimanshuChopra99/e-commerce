import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft,
  Bike,
  CalendarDays,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  Wifi,
  WifiOff,
  Ban,
  CircleCheck,
  Wallet,
  PackageCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchAdminDeliveryPartnerById,
  updateAdminDeliveryPartnerStatus,
  removeAdminDeliveryPartner,
} from '@/store/adminDeliveryPartnersSlice'
import { adminDeliveryPartnersApi } from '@/lib/api'
import { adminTracker } from '@/services/admin-tracker'
import { formatCurrency, formatDate } from '@/config/brand'
import { cn, getDisplayNameInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RecordNotFound } from '@/components/empty-state'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/features/orders/components/order-status-badge'
import { DeliveryPartnerFormDialog } from './components/delivery-partner-form-dialog'
import {
  deliveryPartnerStatusStyles,
  vehicleTypes,
  vehicleTypeStyles,
} from './delivery-partners-data'

export function DeliveryPartnerDetailPage() {
  const { deliveryPartnerId } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const reduxPartners = useSelector((state) => state.adminDeliveryPartners?.items || [])
  const reduxCurrent = useSelector((state) => state.adminDeliveryPartners?.current)

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [partnerLoading, setPartnerLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // Live GPS coords pushed via socket (overrides DB value while partner is active)
  const [liveLocation, setLiveLocation] = useState(null)

  // Fetch partner + orders on mount / id change.
  useEffect(() => {
    let active = true
    dispatch(fetchAdminDeliveryPartnerById(deliveryPartnerId))
      .catch(() => {})
      .finally(() => {
        if (active) setPartnerLoading(false)
      })
    adminDeliveryPartnersApi
      .listOrders(deliveryPartnerId, { limit: 100 })
      .then((res) => setOrders(res.data || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false))
    return () => {
      active = false
    }
  }, [dispatch, deliveryPartnerId])

  // Live location subscription via admin socket
  useEffect(() => {
    const socket = adminTracker.socket
    if (!socket) return

    const onReceiveLocation = (data) => {
      // Only accept if the event carries this partner's publicId, or fall back to
      // accepting all pings (global echo) since the delivery partner detail page
      // shows only one partner anyway.
      const incomingId = data.partnerPublicId
      if (!incomingId || incomingId === deliveryPartnerId) {
        if (data.lat && data.lng) setLiveLocation({ lat: data.lat, lng: data.lng })
        else if (data.latitude && data.longitude) setLiveLocation({ lat: data.latitude, lng: data.longitude })
      }
    }

    const onPartnerLocation = (data) => {
      if (data.lat && data.lng) setLiveLocation({ lat: data.lat, lng: data.lng })
    }

    socket.on('receive-location', onReceiveLocation)
    socket.on('delivery:partner_location', onPartnerLocation)
    return () => {
      socket.off('receive-location', onReceiveLocation)
      socket.off('delivery:partner_location', onPartnerLocation)
    }
  }, [deliveryPartnerId])

  // 1. Search Redux store first (list or current), matching public ids.
  let rawPartner =
    reduxCurrent && String(reduxCurrent.publicId || reduxCurrent.id) === String(deliveryPartnerId)
      ? reduxCurrent
      : reduxPartners.find(
          (p) =>
            String(p.id) === String(deliveryPartnerId) ||
            String(p.publicId) === String(deliveryPartnerId)
        )

  // 2. Normalise defensively.
  const partner = rawPartner
    ? {
        ...rawPartner,
        id: rawPartner.id || rawPartner.publicId,
        publicId: rawPartner.publicId || rawPartner.id,
        firstName: rawPartner.firstName || rawPartner.fullName?.split(' ')[0] || 'Partner',
        lastName: rawPartner.lastName || rawPartner.fullName?.split(' ').slice(1).join(' ') || '',
        email: (rawPartner.email || '').trim().toLowerCase(),
        phone: rawPartner.phone || 'N/A',
        vehicleType: rawPartner.vehicleType || 'bike',
        status: rawPartner.status || 'active',
        isOnline: Boolean(rawPartner.isOnline),
        totalDeliveries: rawPartner.totalDeliveries ?? 0,
        deliveredCount: rawPartner.deliveredCount ?? 0,
        inTransitCount: rawPartner.inTransitCount ?? 0,
        earnings: Number(rawPartner.earnings ?? 0),
      }
    : null

  if (!partner && partnerLoading) {
    return (
      <>
        <PageHeader />
        <Main className='flex flex-1 flex-col'>
          <div className='py-12 text-center text-sm font-medium text-muted-foreground'>
            Loading delivery partner...
          </div>
        </Main>
      </>
    )
  }

  if (!partner) {
    return (
      <>
        <PageHeader />
        <Main className='flex flex-1 flex-col'>
          <RecordNotFound
            title='Delivery partner not found'
            description={`No delivery partner matches the id "${deliveryPartnerId}".`}
            backTo='/delivery-partners'
            backLabel='Back to Delivery Partners'
          />
        </Main>
      </>
    )
  }

  const name = `${partner.firstName} ${partner.lastName}`.trim()
  const vehicleMeta = vehicleTypes.find((v) => v.value === partner.vehicleType)

  const stats = [
    {
      label: 'Total Deliveries',
      value: String(partner.totalDeliveries),
      icon: PackageCheck,
    },
    {
      label: 'Delivered',
      value: String(partner.deliveredCount),
      icon: CircleCheck,
    },
    {
      label: 'In Transit',
      value: String(partner.inTransitCount),
      icon: Bike,
    },
    {
      label: 'Earnings',
      value: formatCurrency(partner.earnings),
      icon: Wallet,
    },
  ]

  const toggleStatus = async () => {
    const next = partner.status === 'blocked' ? 'active' : 'blocked'
    try {
      await dispatch(
        updateAdminDeliveryPartnerStatus({ id: partner.publicId, status: next })
      ).unwrap()
      dispatch(fetchAdminDeliveryPartnerById(deliveryPartnerId))
      toast.success(`${name} has been ${next === 'blocked' ? 'blocked' : 'reactivated'}.`)
    } catch (error) {
      toast.error(error || 'Unable to update status.')
    }
  }

  const handleDelete = async () => {
    try {
      await dispatch(removeAdminDeliveryPartner(partner.publicId)).unwrap()
      toast.success(`${name} has been deleted.`)
      navigate('/delivery-partners')
    } catch (error) {
      toast.error(error || 'Unable to delete this delivery partner.')
    }
  }

  return (
    <>
      <PageHeader />

      <Main className='flex flex-1 flex-col gap-6'>
        {/* Heading */}
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <Button variant='outline' size='icon' asChild>
              <Link to='/delivery-partners' aria-label='Back to delivery partners'>
                <ArrowLeft />
              </Link>
            </Button>
            <div className='flex items-center gap-3'>
              <Avatar className='size-12'>
                <AvatarFallback>{getDisplayNameInitials(name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className='flex flex-wrap items-center gap-2'>
                  <h2 className='text-2xl font-bold tracking-tight'>{name}</h2>
                  <Badge
                    variant='outline'
                    className={cn('gap-1 capitalize', vehicleTypeStyles.get(partner.vehicleType))}
                  >
                    {vehicleMeta?.icon && <vehicleMeta.icon className='size-3' />}
                    {partner.vehicleType}
                  </Badge>
                  <Badge
                    variant='outline'
                    className={cn(
                      'capitalize',
                      deliveryPartnerStatusStyles.get(partner.status)
                    )}
                  >
                    {partner.status}
                  </Badge>
                </div>
                <p className='text-muted-foreground'>
                  Partner since {formatDate(partner.createdAt)} ·{' '}
                  {partner.publicId || partner.id}
                </p>
              </div>
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={() => toast.success(`Email drafted to ${partner.email}.`)}
            >
              <Mail /> Email partner
            </Button>
            <Button variant='outline' onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button
              variant='outline'
              className={
                partner.status === 'blocked'
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-destructive hover:text-destructive'
              }
              onClick={toggleStatus}
            >
              {partner.status === 'blocked' ? <CircleCheck /> : <Ban />}
              {partner.status === 'blocked' ? 'Reactivate' : 'Block'}
            </Button>
            <Button
              variant='outline'
              className='text-destructive hover:text-destructive'
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className='flex items-center justify-between gap-2 py-1'>
                <div>
                  <p className='text-sm text-muted-foreground'>{stat.label}</p>
                  <p className='text-2xl font-bold'>{stat.value}</p>
                </div>
                <stat.icon className='size-5 text-muted-foreground' />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='grid gap-6 lg:grid-cols-3'>
          {/* Delivery history */}
          <div className='flex flex-col gap-6 lg:col-span-2'>
            <Card>
              <CardHeader>
                <CardTitle>Delivery history</CardTitle>
                <CardDescription>
                  Every order assigned to {partner.firstName}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <p className='py-8 text-center text-sm text-muted-foreground'>
                    Loading deliveries...
                  </p>
                ) : orders.length === 0 ? (
                  <p className='py-8 text-center text-sm text-muted-foreground'>
                    No orders have been assigned to this partner yet.
                  </p>
                ) : (
                  <div className='overflow-hidden rounded-md border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className='text-end'>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Link
                                to={`/orders/${order.id}`}
                                className='font-medium hover:underline'
                              >
                                {order.orderNumber || order.order_number}
                              </Link>
                            </TableCell>
                            <TableCell className='text-nowrap'>
                              {formatDate(order.placedAt || order.placed_at)}
                            </TableCell>
                            <TableCell className='text-nowrap'>
                              {order.customerName || order.customer?.name || '—'}
                            </TableCell>
                            <TableCell>
                              <PaymentStatusBadge
                                status={order.paymentStatus || order.payment_status}
                              />
                            </TableCell>
                            <TableCell>
                              <OrderStatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className='text-end font-medium text-nowrap'>
                              {formatCurrency(
                                order.grandTotal ?? order.grand_total ?? order.total
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact + details */}
          <div className='flex flex-col gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <Mail className='size-4 shrink-0 text-muted-foreground' />
                  <span className='truncate'>{partner.email}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Phone className='size-4 shrink-0 text-muted-foreground' />
                  {partner.phone}
                </div>
                <div className='flex items-center gap-2'>
                  {vehicleMeta?.icon && (
                    <vehicleMeta.icon className='size-4 shrink-0 text-muted-foreground' />
                  )}
                  <span className='capitalize'>{partner.vehicleType} courier</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CalendarDays className='size-4 shrink-0 text-muted-foreground' />
                  Joined {formatDate(partner.createdAt)}
                </div>
                <Separator />
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Availability</span>
                  <Badge
                    variant='outline'
                    className={cn(
                      'gap-1',
                      partner.isOnline
                        ? 'bg-teal-100/40 text-teal-900 dark:text-teal-200 border-teal-300/60'
                        : 'bg-neutral-300/40 border-neutral-300'
                    )}
                  >
                    {partner.isOnline ? <Wifi className='size-3' /> : <WifiOff className='size-3' />}
                    {partner.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current location</CardTitle>
                <CardDescription>
                  Last reported GPS position.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const lat = liveLocation?.lat ?? partner.currentLat
                  const lng = liveLocation?.lng ?? partner.currentLng
                  return (
                    <div className='flex gap-2 text-sm'>
                      <MapPin className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                      {lat != null && lng != null ? (
                        <span className='text-muted-foreground flex items-center gap-2'>
                          {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                          {liveLocation && (
                            <span className='flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-medium'>
                              <span className='relative flex h-2 w-2'>
                                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75' />
                                <span className='relative inline-flex rounded-full h-2 w-2 bg-teal-500' />
                              </span>
                              Live
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className='text-muted-foreground'>
                          No location reported yet.
                        </span>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>

      <DeliveryPartnerFormDialog
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next)
          if (!next) dispatch(fetchAdminDeliveryPartnerById(deliveryPartnerId))
        }}
        currentRow={partner}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${name}"?`}
        desc='This delivery partner will be permanently removed. Their past deliveries stay on record.'
        confirmText='Delete partner'
        destructive
        handleConfirm={handleDelete}
      />
    </>
  )
}
