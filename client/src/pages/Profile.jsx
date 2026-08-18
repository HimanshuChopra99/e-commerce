import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Heart,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Save,
  Trash2,
  Truck,
  UserRound,
  X,
  ExternalLink,
} from 'lucide-react'
import { logoutUser, setUser } from '../store/authSlice'
import { authApi } from '../lib/api'
import { showToast } from '../lib/toast'
import { fetchMyOrders } from '../store/ordersSlice'
import { selectCartItems } from '../store/cartSlice'
import MapAddressPicker from '../components/MapAddressPicker'
import {
  fetchFavourites,
  selectFavouriteProducts,
  toggleWishlist,
} from '../store/wishlistSlice'

const blankAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  lat: null,
  lng: null,
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  processing: { label: 'Processing', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  shipped: { label: 'Shipped', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  delivered: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  returned: { label: 'Returned', className: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
}

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : ''

function imageSrc(image) {
  if (!image) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'
  return image.startsWith('http') ? image : `${IMAGE_BASE}${image}`
}

function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

export default function Profile() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, initialized } = useSelector((state) => state.auth)
  const { items: orders, loading: ordersLoading, error: ordersError } = useSelector(
    (state) => state.orders
  )
  const cart = useSelector(selectCartItems)
  const favouriteProducts = useSelector(selectFavouriteProducts)
  const favouritesLoading = useSelector((state) => state.wishlist.loading)

  const [tab, setTab] = useState('account')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: blankAddress,
  })

  useEffect(() => {
    if (!user) return
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      address: { ...blankAddress, ...(user.address || {}) },
    })
  }, [user])

  useEffect(() => {
    if (!user?.id) return
    dispatch(fetchMyOrders())
    dispatch(fetchFavourites())
  }, [user?.id, dispatch])

  if (initialized && !user) {
    return (
      <section className='mx-auto max-w-md px-4 py-20 text-center'>
        <div className='mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-600'>
          <UserRound className='size-6' />
        </div>
        <h1 className='mt-5 text-2xl font-bold text-slate-900'>Account Sign In</h1>
        <p className='mt-2 text-sm text-slate-500 leading-relaxed'>
          Please sign in to access your saved cart, favourites, profile details, and order history.
        </p>
        <Link
          to='/login?redirect=/profile'
          className='mt-6 inline-flex items-center justify-center gap-2 w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition'
        >
          Sign In <ArrowRight className='size-4' />
        </Link>
      </section>
    )
  }

  if (!user) return null

  const setAddress = (key, value) => {
    setForm((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }))
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const hasAddress = Object.values(form.address).some(
        (value) => value !== null && typeof value !== 'undefined' && String(value).trim().length > 0
      )
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        ...(hasAddress ? { address: form.address } : {}),
      }
      const response = await authApi.updateMe(payload)
      dispatch(setUser(response.data))
      const successMessage = 'Your profile details have been saved.'
      setMessage({ type: 'success', text: successMessage })
      showToast(successMessage, 'profile')
    } catch (error) {
      const errorMessage = error.message || 'Unable to save changes.'
      setMessage({ type: 'error', text: errorMessage })
      showToast(errorMessage, 'error', { title: 'Profile update failed' })
    } finally {
      setSaving(false)
    }
  }

  const confirmLogout = async () => {
    setLoggingOut(true)
    await dispatch(logoutUser())
    setLoggingOut(false)
    setLogoutOpen(false)
    showToast('You have been logged out safely.', 'profile', { title: 'Signed out' })
    navigate('/', { replace: true })
  }

  const nav = [
    { id: 'account', label: 'Account Details', Icon: UserRound },
    { id: 'orders', label: 'Order History', Icon: Package, count: orders.length },
    { id: 'favourites', label: 'Saved Favourites', Icon: Heart, count: favouriteProducts.length },
  ]

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  return (
    <div className='min-h-screen bg-slate-50/60 pb-16 pt-8'>
      <div className='mx-auto max-w-6xl px-4 sm:px-6 lg:px-8'>
        {/* TOP PROFILE BAR */}
        <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8'>
          <div className='flex flex-col justify-between gap-6 sm:flex-row sm:items-center'>
            <div className='flex items-center gap-4'>
              <div className='flex size-14 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white'>
                {initials || 'U'}
              </div>
              <div>
                <h1 className='text-xl font-bold text-slate-900'>
                  {user.firstName} {user.lastName}
                </h1>
                <p className='text-sm text-slate-500'>{user.email}</p>
              </div>
            </div>

            {/* QUICK STATS */}
            <div className='flex items-center gap-6 border-t border-slate-100 pt-4 sm:border-t-0 sm:pt-0'>
              <div className='text-left sm:text-right'>
                <p className='text-xs font-medium text-slate-500'>Total Orders</p>
                <p className='text-lg font-bold text-slate-900'>{orders.length}</p>
              </div>
              <div className='h-8 w-px bg-slate-200' />
              <div className='text-left sm:text-right'>
                <p className='text-xs font-medium text-slate-500'>Wishlist</p>
                <p className='text-lg font-bold text-slate-900'>{favouriteProducts.length}</p>
              </div>
              <div className='h-8 w-px bg-slate-200' />
              <Link to='/cart' className='group text-left sm:text-right'>
                <p className='text-xs font-medium text-slate-500 group-hover:text-blue-600 transition'>Cart Items</p>
                <p className='text-lg font-bold text-slate-900 group-hover:text-blue-600 transition'>{cart.length}</p>
              </Link>
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className='mt-6 grid gap-6 lg:grid-cols-[240px_1fr]'>
          {/* SIDEBAR */}
          <aside className='h-fit rounded-xl border border-slate-200 bg-white p-2 shadow-xs'>
            <nav className='space-y-1' aria-label='Account Navigation'>
              {nav.map(({ id, label, Icon, count }) => {
                const active = tab === id
                return (
                  <button
                    key={id}
                    type='button'
                    onClick={() => setTab(id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <Icon className='size-4' />
                      <span>{label}</span>
                    </div>
                    {count !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}

              <div className='my-2 border-t border-slate-100' />

              <button
                type='button'
                onClick={() => setLogoutOpen(true)}
                className='flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50'
              >
                <LogOut className='size-4' /> Sign Out
              </button>
            </nav>
          </aside>

          {/* CONTENT AREA */}
          <main className='min-w-0'>
            {tab === 'account' && (
              <AccountPanel
                form={form}
                setForm={setForm}
                setAddress={setAddress}
                user={user}
                saving={saving}
                message={message}
                onSubmit={saveProfile}
              />
            )}
            {tab === 'orders' && (
              <OrdersPanel
                orders={orders}
                loading={ordersLoading}
                error={ordersError}
              />
            )}
            {tab === 'favourites' && (
              <FavouritesPanel
                products={favouriteProducts}
                loading={favouritesLoading}
                dispatch={dispatch}
              />
            )}
          </main>
        </div>
      </div>

      {/* LOGOUT MODAL */}
      {logoutOpen && (
        <LogoutModal
          loading={loggingOut}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={confirmLogout}
        />
      )}
    </div>
  )
}

function SectionHeader({ title, description, badge }) {
  return (
    <div className='flex flex-col justify-between gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-center'>
      <div>
        <h2 className='text-lg font-bold text-slate-900'>{title}</h2>
        {description && <p className='mt-1 text-sm text-slate-500'>{description}</p>}
      </div>
      {badge}
    </div>
  )
}

function AccountPanel({ form, setForm, setAddress, user, saving, message, onSubmit }) {
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)

  const handleMapConfirm = (geo) => {
    // Fill the address fields with the picked map location
    setForm((current) => ({
      ...current,
      address: {
        ...current.address,
        lat: geo.lat ?? current.address.lat,
        lng: geo.lng ?? current.address.lng,
        ...(geo.line1 ? { line1: geo.line1 } : {}),
        ...(geo.city ? { city: geo.city } : {}),
        ...(geo.state ? { state: geo.state } : {}),
        ...(geo.postalCode ? { postalCode: geo.postalCode } : {}),
        ...(geo.country ? { country: geo.country } : {}),
      },
    }))
    setIsMapModalOpen(false)
    showToast('Address fields updated from map pin.', 'profile')
  }

  const hasPin = form.address.lat != null && form.address.lng != null

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8'>
        <SectionHeader
          title='Personal Information'
          description='Update your personal details and contact information.'
        />

        <div className='mt-6 grid gap-5 sm:grid-cols-2'>
          <InputField
            label='First Name'
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <InputField
            label='Last Name'
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
          <InputField
            label='Email Address'
            disabled
            value={user.email || ''}
            className='sm:col-span-2'
          />
          <InputField
            label='Phone Number'
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder='+1 (555) 000-0000'
            className='sm:col-span-2'
          />
        </div>

        <div className='mt-8 pt-6 border-t border-slate-100'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-base font-semibold text-slate-900'>Default Delivery Address</h3>
              <p className='text-xs text-slate-500 mt-0.5'>Pre-filled automatically during checkout.</p>
            </div>
            
            {/* BUTTON TO CHOOSE ADDRESS ON MAP */}
            <button
              type='button'
              onClick={() => setIsMapModalOpen(true)}
              className='inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-xs'
            >
              <MapPin className='size-3.5 text-white' />
              {hasPin ? 'Change Pin on Map' : 'Choose Address on Map'}
            </button>
          </div>

          {/* STATUS BADGE FOR SAVED PIN */}
          {hasPin && (
            <div className='mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 font-medium'>
              <CheckCircle2 className='size-3.5 text-emerald-600' />
              <span>
                Exact Doorstep Pin Selected ({Number(form.address.lat).toFixed(4)}, {Number(form.address.lng).toFixed(4)})
              </span>
            </div>
          )}

          {/* ADDRESS INPUT FIELDS */}
          <div className='mt-5 grid gap-5 sm:grid-cols-2'>
            <InputField
              label='Address Line 1'
              value={form.address.line1}
              onChange={(e) => setAddress('line1', e.target.value)}
              placeholder='123 Main Street / House No.'
              className='sm:col-span-2'
            />
            <InputField
              label='Address Line 2 (Optional)'
              value={form.address.line2}
              onChange={(e) => setAddress('line2', e.target.value)}
              placeholder='Apartment, suite, unit, sector'
              className='sm:col-span-2'
            />
            <InputField
              label='City'
              value={form.address.city}
              onChange={(e) => setAddress('city', e.target.value)}
            />
            <InputField
              label='State / Region'
              value={form.address.state}
              onChange={(e) => setAddress('state', e.target.value)}
            />
            <InputField
              label='Postal Code'
              value={form.address.postalCode}
              onChange={(e) => setAddress('postalCode', e.target.value)}
            />
            <InputField
              label='Country'
              value={form.address.country}
              onChange={(e) => setAddress('country', e.target.value)}
            />
          </div>
        </div>

        <div className='mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-6'>
          <button
            type='submit'
            disabled={saving}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-60'
          >
            {saving ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {message && (
            <p
              className={`flex items-center gap-2 text-sm font-medium ${
                message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {message.type === 'success' && <CheckCircle2 className='size-4' />}
              {message.text}
            </p>
          )}
        </div>
      </div>

      {/* MAP PICKER MODAL OVERLAY */}
      {isMapModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs'>
          <div className='relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200'>
            <div className='flex items-center justify-between pb-4 mb-4 border-b border-slate-100'>
              <div className='flex items-center gap-2'>
                <MapPin className='size-5 text-rose-500' />
                <h3 className='text-base font-bold text-slate-900'>Select Your Location on Map</h3>
              </div>
              <button
                type='button'
                onClick={() => setIsMapModalOpen(false)}
                className='text-slate-400 hover:text-slate-600 p-1 rounded-md'
              >
                <X className='size-5' />
              </button>
            </div>

            <MapAddressPicker
              initialLat={form.address.lat}
              initialLng={form.address.lng}
              onConfirm={handleMapConfirm}
              onCancel={() => setIsMapModalOpen(false)}
            />
          </div>
        </div>
      )}
    </form>
  )
}

function InputField({ label, disabled, className = '', ...props }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className='block text-xs font-semibold text-slate-700'>{label}</label>
      <input
        disabled={disabled}
        className='w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-500'
        {...props}
      />
    </div>
  )
}

function OrdersPanel({ orders, loading, error }) {
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8'>
      <SectionHeader
        title='Order History'
        description='Review past orders and track current shipments.'
        badge={
          <span className='rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'>
            {orders.length} orders
          </span>
        }
      />

      {loading ? (
        <div className='mt-6 space-y-4'>
          {[1, 2, 3].map((key) => (
            <div key={key} className='h-32 animate-pulse rounded-xl bg-slate-100' />
          ))}
        </div>
      ) : error ? (
        <div className='mt-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200'>
          {error}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          Icon={Package}
          title='No orders found'
          description='When you place an order, it will appear here.'
          actionLabel='Start Shopping'
          actionTo='/products'
        />
      ) : (
        <div className='mt-6 space-y-4'>
          {orders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.processing
            const orderItems = order.items || []

            return (
              <article
                key={order.id}
                className='overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-sm'
              >
                {/* SUMMARY HEADER */}
                <div className='flex flex-wrap items-center justify-between gap-4 bg-slate-50/80 px-6 py-4 text-sm border-b border-slate-100'>
                  <div className='flex items-center gap-4'>
                    <div>
                      <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-400 block'>
                        Order Reference
                      </span>
                      <span className='font-mono font-bold text-slate-900'>
                        #{order.orderNumber || order.id}
                      </span>
                    </div>
                    <div className='hidden sm:block h-7 w-px bg-slate-200' />
                    <div className='hidden sm:block'>
                      <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-400 block'>
                        Date Placed
                      </span>
                      <span className='font-medium text-slate-700'>
                        {new Date(order.placedAt || order.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center gap-3'>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${status.className}`}
                    >
                      <span className={`size-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                    <span className='text-base font-bold text-slate-900'>
                      {money(order.grandTotal || order.total, order.currency)}
                    </span>
                  </div>
                </div>

                {/* ITEMS PREVIEW ROW */}
                <div className='flex items-center justify-between px-6 py-4 bg-white'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <div className='flex -space-x-2 overflow-hidden'>
                      {orderItems.slice(0, 3).map((item, idx) => (
                        <img
                          key={idx}
                          src={imageSrc(item.image || item.productImage)}
                          alt={item.name || item.productName}
                          className='size-11 rounded-md border-2 border-white object-cover bg-slate-100 shadow-xs'
                        />
                      ))}
                    </div>
                    <p className='text-xs font-medium text-slate-600 truncate'>
                      {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                      {orderItems.length > 0 && (
                        <span className='text-slate-400 ml-1'>
                          ({orderItems[0]?.name || orderItems[0]?.productName})
                        </span>
                      )}
                    </p>
                  </div>

                  <Link
                    to={`/orders/${order.id}`}
                    className='inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition shrink-0 ml-2'
                  >
                    View Order Details <ChevronRight className='size-4' />
                  </Link>
                </div>

                {/* FOOTER */}
                <div className='flex items-center justify-between bg-slate-50/50 px-6 py-3 border-t border-slate-100 text-xs text-slate-500'>
                  <span className='flex items-center gap-2'>
                    <Truck className='size-3.5 text-slate-400' />
                    {order.trackingNumber
                      ? `${order.courier || 'Courier'}: ${order.trackingNumber}`
                      : 'Status updates automatically'}
                  </span>
                  <Link to={`/orders/${order.id}`} className='font-medium text-slate-700 hover:text-slate-900'>
                    View Receipt
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FavouritesPanel({ products, loading, dispatch }) {
  const remove = async (productId) => {
    try {
      await dispatch(toggleWishlist(productId)).unwrap()
      showToast('Product removed from favourites.', 'favourite')
    } catch (error) {
      showToast(error || 'Unable to update favourites.', 'error', {
        title: 'Favourite update failed',
      })
    }
  }

  return (
    <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8'>
      <SectionHeader
        title='Saved Items'
        description='Products you have bookmarked for later.'
        badge={
          <span className='rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600'>
            {products.length} saved
          </span>
        }
      />

      {loading && products.length === 0 ? (
        <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3].map((key) => (
            <div key={key} className='h-48 animate-pulse rounded-lg bg-slate-100' />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          Icon={Heart}
          title='No favourites saved'
          description='Items you save while browsing will appear here.'
          actionLabel='Browse Products'
          actionTo='/products'
        />
      ) : (
        <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {products.map((product) => {
            const productId = product.id || product.publicId
            return (
              <div
                key={productId}
                className='group relative flex flex-col justify-between rounded-lg border border-slate-200 bg-white overflow-hidden transition hover:border-slate-300 hover:shadow-xs'
              >
                <div className='relative aspect-square w-full bg-slate-50 overflow-hidden border-b border-slate-100'>
                  <img
                    src={imageSrc(product.image || product.images?.[0])}
                    alt={product.name}
                    className='size-full object-cover transition duration-300 group-hover:scale-105'
                    loading='lazy'
                    decoding='async'
                  />
                  <button
                    type='button'
                    onClick={() => remove(productId)}
                    className='absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-slate-400 hover:text-rose-600 shadow-xs transition'
                    aria-label={`Remove ${product.name}`}
                  >
                    <Trash2 className='size-4' />
                  </button>
                </div>

                <div className='p-4 flex-1 flex flex-col justify-between'>
                  <div>
                    <span className='text-[10px] font-semibold tracking-wider text-slate-400 uppercase'>
                      {product.category?.name || product.brand || 'Item'}
                    </span>
                    <h3 className='mt-0.5 text-sm font-semibold text-slate-900 line-clamp-1'>
                      {product.name}
                    </h3>
                  </div>

                  <div className='mt-4 flex items-center justify-between border-t border-slate-100 pt-3'>
                    <span className='text-sm font-bold text-slate-900'>{money(product.price)}</span>
                    <Link
                      to={`/product/${product.slug || productId}`}
                      className='inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline'
                    >
                      View Item <ExternalLink className='size-3' />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className='py-12 text-center'>
      <div className='mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500'>
        <Icon className='size-5' />
      </div>
      <h3 className='mt-4 text-sm font-semibold text-slate-900'>{title}</h3>
      <p className='mt-1 text-xs text-slate-500 max-w-xs mx-auto'>{description}</p>
      <Link
        to={actionTo}
        className='mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition'
      >
        {actionLabel} <ArrowRight className='size-3.5' />
      </Link>
    </div>
  )
}

function LogoutModal({ loading, onCancel, onConfirm }) {
  useEffect(() => {
    const close = (e) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [loading, onCancel])

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4' role='dialog' aria-modal='true'>
      <div className='fixed inset-0 bg-slate-900/40 backdrop-blur-sm' onClick={onCancel} />
      <div className='relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-slate-200'>
        <button
          type='button'
          onClick={onCancel}
          disabled={loading}
          className='absolute right-4 top-4 text-slate-400 hover:text-slate-600'
        >
          <X className='size-4' />
        </button>

        <h3 className='text-base font-bold text-slate-900'>Confirm Sign Out</h3>
        <p className='mt-2 text-xs text-slate-500 leading-relaxed'>
          Are you sure you want to log out? Your items and cart will remain saved in your account.
        </p>

        <div className='mt-6 flex items-center justify-end gap-3'>
          <button
            type='button'
            onClick={onCancel}
            disabled={loading}
            className='rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={loading}
            className='inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60'
          >
            {loading && <Loader2 className='size-3.5 animate-spin' />}
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )
}