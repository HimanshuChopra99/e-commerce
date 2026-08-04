import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
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
} from 'lucide-react'
import { logoutUser, setUser } from '../store/authSlice'
import { authApi } from '../lib/api'
import { showToast } from '../lib/toast'
import { fetchMyOrders } from '../store/ordersSlice'
import { selectCartItems } from '../store/cartSlice'
import {
  fetchFavourites,
  selectFavouriteProducts,
  toggleWishlist,
} from '../store/wishlistSlice'

const blankAddress = {
  line1: '', line2: '', city: '', state: '', postalCode: '', country: '',
}
const fieldClass =
  'mt-2 w-full rounded-2xl border border-black/10 bg-[#F7F7F4] px-4 py-3.5 text-sm font-medium outline-none transition focus:border-[#4A69E2] focus:bg-white focus:ring-4 focus:ring-[#4A69E2]/10 disabled:cursor-not-allowed disabled:text-neutral-400'
const statusClass = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  returned: 'bg-neutral-200 text-neutral-700',
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
    style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2,
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
    firstName: '', lastName: '', phone: '', address: blankAddress,
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
      <section className='mx-auto max-w-xl px-5 py-24 text-center'>
        <span className='mx-auto grid size-16 place-items-center rounded-3xl bg-[#4A69E2] text-white shadow-lg shadow-[#4A69E2]/20'>
          <UserRound className='size-7' />
        </span>
        <h1 className='mt-6 text-3xl font-black uppercase'>Your account</h1>
        <p className='mt-3 text-neutral-500'>
          Sign in to access your saved cart, favourites, profile and complete order history.
        </p>
        <Link
          to='/login?redirect=/profile'
          className='mt-7 inline-flex items-center gap-2 rounded-full bg-[#232321] px-7 py-3.5 text-sm font-bold text-white'
        >
          Sign in <ArrowRight className='size-4' />
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
      const hasAddress = Object.values(form.address).some((value) => value.trim())
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        ...(hasAddress ? { address: form.address } : {}),
      }
      const response = await authApi.updateMe(payload)
      dispatch(setUser(response.data))
      const successMessage = 'Your account details have been saved.'
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
    { id: 'account', label: 'Account', Icon: UserRound },
    { id: 'orders', label: 'Orders', Icon: Package, count: orders.length },
    { id: 'favourites', label: 'Favourite', Icon: Heart, count: favouriteProducts.length },
  ]
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  return (
    <section className='mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12'>
      <div className='relative overflow-hidden rounded-[32px] bg-[#232321] px-6 py-8 text-white sm:px-10 sm:py-10'>
        <div className='absolute -right-20 -top-28 size-72 rounded-full bg-[#4A69E2]/40 blur-3xl' />
        <div className='relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end'>
          <div className='flex items-center gap-5'>
            <span className='grid size-16 shrink-0 place-items-center rounded-3xl bg-[#FFA52F] text-xl font-black text-[#232321] sm:size-20 sm:text-2xl'>
              {initials || 'K'}
            </span>
            <div>
              <p className='text-[11px] font-black tracking-[.22em] text-[#FFA52F]'>
                KICKS MEMBERSHIP
              </p>
              <h1 className='mt-2 text-3xl font-black uppercase sm:text-4xl'>
                Welcome, {user.firstName}
              </h1>
              <p className='mt-2 text-sm text-white/60'>{user.email}</p>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-2 sm:gap-3'>
            <SummaryStat value={orders.length} label='Orders' />
            <SummaryStat value={favouriteProducts.length} label='Saved' />
            <Link to='/cart' className='block'>
              <SummaryStat value={cart.length} label='Cart' interactive />
            </Link>
          </div>
        </div>
      </div>

      <div className='mt-6 grid gap-6 lg:grid-cols-[270px_1fr]'>
        <aside className='h-fit rounded-[28px] border border-black/5 bg-white p-3 shadow-sm'>
          <div className='border-b border-black/5 px-4 py-4'>
            <p className='text-xs font-black uppercase tracking-widest text-neutral-400'>Member account</p>
            <p className='mt-2 truncate font-black'>{user.firstName} {user.lastName}</p>
          </div>
          <nav className='space-y-1 py-3' aria-label='Account sections'>
            {nav.map(({ id, label, Icon, count }) => (
              <button
                key={id}
                type='button'
                onClick={() => setTab(id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition ${
                  tab === id
                    ? 'bg-[#4A69E2] text-white shadow-md shadow-[#4A69E2]/20'
                    : 'text-[#232321] hover:bg-[#F0EFEB]'
                }`}
                aria-current={tab === id ? 'page' : undefined}
              >
                <Icon className='size-4.5' />
                {label}
                {count !== undefined && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] ${
                    tab === id ? 'bg-white/20' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
            <div className='my-2 border-t border-black/5' />
            <button
              type='button'
              onClick={() => setLogoutOpen(true)}
              className='flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50'
            >
              <LogOut className='size-4.5' /> Log out
            </button>
          </nav>
        </aside>

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

      {logoutOpen && (
        <LogoutModal
          loading={loggingOut}
          onCancel={() => setLogoutOpen(false)}
          onConfirm={confirmLogout}
        />
      )}
    </section>
  )
}

function SummaryStat({ value, label, interactive = false }) {
  return (
    <div className={`min-w-20 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-center backdrop-blur-sm sm:min-w-24 ${
      interactive ? 'transition hover:bg-white/15' : ''
    }`}>
      <p className='text-xl font-black sm:text-2xl'>{value}</p>
      <p className='text-[10px] font-bold uppercase tracking-widest text-white/55'>{label}</p>
    </div>
  )
}

function PanelHeader({ eyebrow, title, description, action }) {
  return (
    <div className='flex flex-col justify-between gap-4 border-b border-black/5 pb-6 sm:flex-row sm:items-end'>
      <div>
        <p className='text-[11px] font-black tracking-[.2em] text-[#4A69E2]'>{eyebrow}</p>
        <h2 className='mt-1 text-2xl font-black uppercase sm:text-3xl'>{title}</h2>
        {description && <p className='mt-2 max-w-2xl text-sm text-neutral-500'>{description}</p>}
      </div>
      {action}
    </div>
  )
}

function AccountPanel({ form, setForm, setAddress, user, saving, message, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className='rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-8'>
      <PanelHeader
        eyebrow='PERSONAL INFORMATION'
        title='Account details'
        description='Keep your contact details and default delivery address ready for a faster checkout.'
      />

      <div className='mt-7 grid gap-5 sm:grid-cols-2'>
        <Field label='First name'>
          <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className={fieldClass} />
        </Field>
        <Field label='Last name'>
          <input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className={fieldClass} />
        </Field>
        <Field label='Email address' className='sm:col-span-2'>
          <input disabled value={user.email || ''} className={fieldClass} />
        </Field>
        <Field label='Phone number' className='sm:col-span-2'>
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder='Add your phone number' className={fieldClass} />
        </Field>
      </div>

      <div className='mt-9 border-t border-black/5 pt-7'>
        <div className='flex items-center gap-3'>
          <span className='grid size-10 place-items-center rounded-2xl bg-[#4A69E2]/10 text-[#4A69E2]'>
            <MapPin className='size-5' />
          </span>
          <div>
            <h3 className='font-black uppercase'>Default delivery address</h3>
            <p className='text-xs text-neutral-500'>Used to prefill checkout on every device.</p>
          </div>
        </div>
        <div className='mt-6 grid gap-5 sm:grid-cols-2'>
          <Field label='Address line 1' className='sm:col-span-2'>
            <input value={form.address.line1} onChange={(event) => setAddress('line1', event.target.value)} placeholder='House number and street' className={fieldClass} />
          </Field>
          <Field label='Address line 2 (optional)' className='sm:col-span-2'>
            <input value={form.address.line2} onChange={(event) => setAddress('line2', event.target.value)} placeholder='Apartment, suite, etc.' className={fieldClass} />
          </Field>
          <Field label='City'>
            <input value={form.address.city} onChange={(event) => setAddress('city', event.target.value)} className={fieldClass} />
          </Field>
          <Field label='State / region'>
            <input value={form.address.state} onChange={(event) => setAddress('state', event.target.value)} className={fieldClass} />
          </Field>
          <Field label='Postal code'>
            <input value={form.address.postalCode} onChange={(event) => setAddress('postalCode', event.target.value)} className={fieldClass} />
          </Field>
          <Field label='Country'>
            <input value={form.address.country} onChange={(event) => setAddress('country', event.target.value)} className={fieldClass} />
          </Field>
        </div>
      </div>

      <div className='mt-8 flex flex-col items-start gap-4 border-t border-black/5 pt-6 sm:flex-row sm:items-center'>
        <button disabled={saving} className='inline-flex items-center gap-2 rounded-full bg-[#4A69E2] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#3e59cf] disabled:opacity-60'>
          {saving ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {message && (
          <p className={`flex items-center gap-2 text-sm font-semibold ${
            message.type === 'success' ? 'text-emerald-700' : 'text-red-600'
          }`} role='status'>
            {message.type === 'success' && <CheckCircle2 className='size-4' />}
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}

function Field({ label, className = '', children }) {
  return <label className={`text-sm font-bold text-neutral-700 ${className}`}>{label}{children}</label>
}

function OrdersPanel({ orders, loading, error }) {
  return (
    <div className='rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-8'>
      <PanelHeader
        eyebrow='PURCHASE HISTORY'
        title='Your orders'
        description='Every purchase linked to your account, available whenever you sign in.'
        action={<span className='rounded-full bg-neutral-100 px-4 py-2 text-xs font-black text-neutral-600'>{orders.length} total</span>}
      />

      {loading ? (
        <div className='space-y-4 py-7'>{[1, 2, 3].map((key) => <div key={key} className='h-36 animate-pulse rounded-3xl bg-neutral-100' />)}</div>
      ) : error ? (
        <div className='mt-6 rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700'>{error}</div>
      ) : orders.length === 0 ? (
        <EmptyState
          Icon={Package}
          title='No orders yet'
          description='When you place an order, its items and delivery progress will appear here.'
          actionLabel='Shop new drops'
          actionTo='/products'
        />
      ) : (
        <div className='mt-6 space-y-5'>
          {orders.map((order) => (
            <article key={order.id} className='overflow-hidden rounded-3xl border border-black/8 transition hover:border-[#4A69E2]/35 hover:shadow-md'>
              <div className='flex flex-col justify-between gap-4 bg-[#F7F7F4] px-5 py-4 sm:flex-row sm:items-center'>
                <div>
                  <p className='text-xs font-black uppercase tracking-widest text-neutral-400'>Order</p>
                  <p className='mt-1 font-black'>{order.orderNumber || order.id}</p>
                </div>
                <div className='flex flex-wrap items-center gap-3 sm:justify-end'>
                  <span className='flex items-center gap-1.5 text-xs font-semibold text-neutral-500'>
                    <CalendarDays className='size-3.5' />
                    {new Date(order.placedAt || order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusClass[order.status] || 'bg-neutral-100 text-neutral-700'}`}>
                    {order.status || 'processing'}
                  </span>
                  <span className='font-black'>{money(order.total || order.grandTotal, order.currency)}</span>
                </div>
              </div>
              <div className='divide-y divide-black/5 px-5'>
                {(order.items || []).map((item, index) => (
                  <Link
                    key={item.id || `${order.id}-${index}`}
                    to={item.slug ? `/product/${item.slug}` : '/products'}
                    className='flex items-center gap-4 py-4 transition hover:bg-neutral-50'
                  >
                    <img src={imageSrc(item.image || item.productImage)} alt={item.name || item.productName} className='size-16 rounded-2xl bg-[#EEEDE9] object-cover sm:size-20' />
                    <div className='min-w-0 flex-1'>
                      <h3 className='truncate text-sm font-black uppercase'>{item.name || item.productName}</h3>
                      <p className='mt-1 text-xs text-neutral-500'>Size {item.size} · {item.color} · Qty {item.quantity}</p>
                      <p className='mt-2 text-sm font-bold'>{money(item.lineTotal || item.unitPrice, order.currency)}</p>
                    </div>
                    <ChevronRight className='size-5 shrink-0 text-neutral-300' />
                  </Link>
                ))}
              </div>
              <div className='flex flex-wrap items-center justify-between gap-3 border-t border-black/5 px-5 py-4 text-xs text-neutral-500'>
                <span className='flex items-center gap-2'>
                  <Truck className='size-4 text-[#4A69E2]' />
                  {order.trackingNumber ? `${order.courier || 'Courier'} · ${order.trackingNumber}` : 'Tracking appears once shipped'}
                </span>
                <Link to='/orders' className='font-black text-[#4A69E2]'>View full history</Link>
              </div>
            </article>
          ))}
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
    <div className='rounded-[28px] border border-black/5 bg-white p-6 shadow-sm sm:p-8'>
      <PanelHeader
        eyebrow='YOUR COLLECTION'
        title='Favourite products'
        description='Products saved from the heart button stay linked to your account across every device.'
        action={<span className='rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-600'>{products.length} saved</span>}
      />

      {loading && products.length === 0 ? (
        <div className='grid gap-5 py-7 sm:grid-cols-2'>{[1, 2, 3, 4].map((key) => <div key={key} className='h-48 animate-pulse rounded-3xl bg-neutral-100' />)}</div>
      ) : products.length === 0 ? (
        <EmptyState
          Icon={Heart}
          title='No favourites yet'
          description='Tap the heart beside Add to Cart on a product page to save it here.'
          actionLabel='Discover products'
          actionTo='/products'
        />
      ) : (
        <div className='mt-6 grid gap-5 sm:grid-cols-2'>
          {products.map((product) => {
            const productId = product.id || product.publicId
            return (
              <article key={productId} className='group overflow-hidden rounded-3xl border border-black/8 bg-[#F8F8F5] transition hover:-translate-y-1 hover:border-[#4A69E2]/30 hover:shadow-lg'>
                <Link to={`/product/${product.slug || productId}`} className='block overflow-hidden bg-[#EDECE8]'>
                  <img src={imageSrc(product.image || product.images?.[0])} alt={product.name} className='aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105' />
                </Link>
                <div className='p-5'>
                  <div className='flex items-start justify-between gap-4'>
                    <Link to={`/product/${product.slug || productId}`} className='min-w-0'>
                      <p className='text-[10px] font-black uppercase tracking-widest text-[#4A69E2]'>{product.category?.name || product.brand || 'Footwear'}</p>
                      <h3 className='mt-1 line-clamp-2 font-black uppercase leading-tight'>{product.name}</h3>
                    </Link>
                    <button type='button' onClick={() => remove(productId)} className='grid size-10 shrink-0 place-items-center rounded-full bg-white text-rose-600 shadow-sm transition hover:bg-rose-50' aria-label={`Remove ${product.name} from favourites`}>
                      <Trash2 className='size-4' />
                    </button>
                  </div>
                  <div className='mt-5 flex items-center justify-between'>
                    <p className='text-lg font-black'>{money(product.price)}</p>
                    <Link to={`/product/${product.slug || productId}`} className='inline-flex items-center gap-1 text-xs font-black text-[#232321]'>
                      View product <ChevronRight className='size-4' />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ Icon, title, description, actionLabel, actionTo }) {
  return (
    <div className='py-16 text-center'>
      <span className='mx-auto grid size-14 place-items-center rounded-3xl bg-[#4A69E2]/10 text-[#4A69E2]'>
        <Icon className='size-6' />
      </span>
      <h3 className='mt-5 text-lg font-black uppercase'>{title}</h3>
      <p className='mx-auto mt-2 max-w-md text-sm text-neutral-500'>{description}</p>
      <Link to={actionTo} className='mt-6 inline-flex items-center gap-2 rounded-full bg-[#232321] px-6 py-3 text-sm font-bold text-white'>
        {actionLabel} <ArrowRight className='size-4' />
      </Link>
    </div>
  )
}

function LogoutModal({ loading, onCancel, onConfirm }) {
  useEffect(() => {
    const close = (event) => {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [loading, onCancel])

  return (
    <div className='fixed inset-0 z-[100] grid place-items-center p-4' role='dialog' aria-modal='true' aria-labelledby='logout-title'>
      <button className='absolute inset-0 bg-black/55 backdrop-blur-sm' onClick={onCancel} aria-label='Cancel logout' />
      <div className='relative w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl sm:p-8'>
        <button type='button' onClick={onCancel} disabled={loading} className='absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200' aria-label='Close'>
          <X className='size-4' />
        </button>
        <span className='grid size-14 place-items-center rounded-3xl bg-red-50 text-red-600'>
          <LogOut className='size-6' />
        </span>
        <h2 id='logout-title' className='mt-5 text-2xl font-black uppercase'>Log out?</h2>
        <p className='mt-2 text-sm leading-relaxed text-neutral-500'>
          Your cart, favourites and order history are safely stored in your account. You can access them again from any device after signing in.
        </p>
        <div className='mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'>
          <button type='button' onClick={onCancel} disabled={loading} className='rounded-full border border-black/10 px-6 py-3 text-sm font-bold hover:bg-neutral-50'>Cancel</button>
          <button type='button' onClick={onConfirm} disabled={loading} className='inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60'>
            {loading && <Loader2 className='size-4 animate-spin' />}
            {loading ? 'Logging out…' : 'Yes, log out'}
          </button>
        </div>
      </div>
    </div>
  )
}
