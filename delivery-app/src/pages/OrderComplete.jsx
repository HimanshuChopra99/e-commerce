import React, { useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Icon from '../components/Icon'
import { selectCompletedOrder } from '../store/slices/orderSlice'
import { setOnline } from '../store/slices/appSlice'

export default function OrderComplete() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const reduxCompletedOrder = useSelector(selectCompletedOrder)

  // Data recovery: Checks location state first, then Redux fallback, then localStorage
  const order = useMemo(() => {
    if (location.state?.order) return location.state.order
    if (reduxCompletedOrder) return reduxCompletedOrder
    try {
      const raw = localStorage.getItem('dp_completed_order')
      if (raw) return JSON.parse(raw)
    } catch {}
    return null
  }, [location.state, reduxCompletedOrder])

  // Safe normalized dynamic fallback data
  const orderNumber = order?.orderNumber || order?.order_number || (order?.id ? String(order.id).replace('#', '') : '1001')
  const customerName = order?.customerName || order?.customer || order?.shippingAddress?.customerName || 'Customer'
  const itemCount = order?.itemCount ?? order?.items?.length ?? 1

  // Dynamic Payout calculation
  const payout = useMemo(() => {
    if (typeof order?.payout === 'number') {
      return `$${order.payout.toFixed(2)}`
    }
    if (order?.payout && typeof order?.payout === 'string') {
      return order.payout.startsWith('$') ? order.payout : `$${order.payout}`
    }
    if (order?.total != null) {
      const amt = Number(order.total) * 0.08
      return `$${Math.max(8.5, amt).toFixed(2)}`
    }
    return '—'
  }, [order])

  const totalValue = useMemo(() => {
    if (order?.total != null) return `$${Number(order.total).toFixed(2)}`
    return '—'
  }, [order])

  const duration = order?.duration || order?.eta || '—'
  const distance = order?.distance || '—'

  const pickupLabel = order?.pickupAddress || order?.pickup?.label || 'KICKS Main Hub'
  const pickupAddress = order?.pickupAddress || ''

  const dropoffLabel = customerName ? `${customerName}` : 'Customer Location'
  const dropoffAddress = [
    order?.shippingAddress?.line1,
    order?.shippingAddress?.city,
    order?.shippingAddress?.state,
  ].filter(Boolean).join(', ') || order?.dropoffAddress || 'Customer Delivery Address'

  const deliveredTime = useMemo(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  const stats = [
    { label: 'Duration', value: duration, icon: 'schedule' },
    { label: 'Distance', value: distance, icon: 'route' },
    { label: 'Payout', value: payout, icon: 'payments', accent: true },
  ]

  return (
    <div className="min-h-dvh bg-background text-on-background font-body-md flex flex-col justify-between px-4 py-6 max-w-md mx-auto antialiased select-none overflow-y-auto">
      {/* Native 60fps Smooth Keyframe Animations */}
      <style>{`
        @keyframes scalePop {
          0% { opacity: 0; transform: scale(0.5); }
          60% { transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .anim-pop { animation: scalePop 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slide { opacity: 0; animation: slideUpFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col justify-center gap-4 my-auto">

        {/* ===== 1. SUCCESS HEADER ===== */}
        <div className="flex flex-col items-center text-center pt-2">
          {/* Animated Success Badge */}
          <div className="relative mb-3 anim-pop">
            <div className="absolute inset-0 rounded-full bg-primary/15 animate-ping opacity-50"></div>
            <div className="relative w-16 h-16 rounded-full bg-surface-container-lowest shadow-lg shadow-primary/10 flex items-center justify-center ring-4 ring-primary/10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary via-primary to-[#9a6bff] flex items-center justify-center text-on-primary shadow-inner">
                <Icon name="check" fill className="text-[26px]" />
              </div>
            </div>
          </div>

          {/* Status Tag */}
          <div 
            className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-2xs mb-2 anim-slide"
            style={{ animationDelay: '0.08s' }}
          >
            <Icon name="check_circle" fill className="text-[14px] text-emerald-600 dark:text-emerald-400" />
            <span>Delivered at {deliveredTime}</span>
          </div>

          <h1 
            className="text-headline-md font-bold text-on-surface tracking-tight anim-slide"
            style={{ animationDelay: '0.12s' }}
          >
            Delivery Complete
          </h1>
          <p 
            className="text-body-md text-on-surface-variant font-medium mt-0.5 anim-slide"
            style={{ animationDelay: '0.16s' }}
          >
            Order #{orderNumber} · Great work! 🎉
          </p>
        </div>

        {/* ===== 2. HERO EARNINGS CARD ===== */}
        <div 
          className="w-full rounded-3xl p-5 text-on-primary shadow-md shadow-primary/15 relative overflow-hidden anim-slide"
          style={{ 
            animationDelay: '0.22s',
            background: 'linear-gradient(135deg, #6b38d4 0%, #7c43ea 50%, #9a6bff 100%)' 
          }}
        >
          {/* Ambient Lighting Background Accents */}
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-sm pointer-events-none" />
          <div className="absolute right-12 -bottom-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
              <Icon name="account_balance_wallet" fill className="text-[13px]" />
              <span>Earnings Added</span>
            </div>

            <div className="text-display-lg font-black tracking-tight mt-2 text-white tabular-nums">
              {payout}
            </div>

            <p className="text-label-sm text-white/80 mt-0.5 font-medium">
              Successfully credited for order #{orderNumber}
            </p>
          </div>
        </div>

        {/* ===== 3. QUICK STATS GRID ===== */}
        <div 
          className="grid grid-cols-3 gap-2 bg-surface-container-lowest p-3 rounded-2xl border border-surface-container-highest/80 shadow-2xs anim-slide"
          style={{ animationDelay: '0.28s' }}
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center p-1">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
                s.accent ? 'bg-primary-fixed text-primary' : 'bg-surface-container/70 text-on-surface-variant'
              }`}>
                <Icon name={s.icon} className="text-[16px]" />
              </div>
              <span className={`text-body-md font-bold tracking-tight tabular-nums ${s.accent ? 'text-primary' : 'text-on-surface'}`}>
                {s.value}
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ===== 4. ROUTE DETAILS CARD ===== */}
        <div 
          className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-highest/80 shadow-2xs anim-slide flex flex-col gap-3"
          style={{ animationDelay: '0.34s' }}
        >
          <div className="flex items-center justify-between border-b border-surface-container-high/40 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Icon name="route" className="text-[16px] text-primary" />
              <h2 className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Trip Details
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">
                {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
              </span>
              <span className="text-[10px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                Delivered
              </span>
            </div>
          </div>

          <div className="relative pl-7 py-0.5">
            {/* Smooth Connecting Line */}
            <div className="absolute left-[11px] top-2.5 bottom-2.5 w-[2px] bg-gradient-to-b from-blue-400 via-primary/50 to-emerald-500" />

            {/* Pickup Node */}
            <div className="relative mb-4">
              <div className="absolute -left-[27px] top-0.5 w-5 h-5 rounded-full bg-blue-50 border-2 border-blue-500 flex items-center justify-center z-10 shadow-2xs">
                <Icon name="storefront" className="text-[11px] text-blue-600 font-bold" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Pickup Warehouse</span>
                <span className="text-body-md font-bold text-on-surface truncate">{pickupLabel}</span>
                <span className="text-label-sm text-on-surface-variant truncate mt-0.5">{pickupAddress}</span>
              </div>
            </div>

            {/* Drop-off Node */}
            <div className="relative">
              <div className="absolute -left-[27px] top-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface-container-lowest flex items-center justify-center z-10 shadow-2xs">
                <Icon name="check" className="text-[11px] text-white font-bold" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Drop-off Destination</span>
                <span className="text-body-md font-bold text-on-surface truncate">{dropoffLabel}</span>
                <span className="text-label-sm text-on-surface-variant truncate mt-0.5">{dropoffAddress}</span>
              </div>
            </div>
          </div>

          {/* Customer & Order Metadata Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/40 text-label-sm text-on-surface-variant">
            <span>Customer: <strong className="text-on-surface font-semibold">{customerName}</strong></span>
            <span>Value: <strong className="text-on-surface font-semibold">{totalValue}</strong></span>
          </div>
        </div>

      </div>

      {/* ===== 5. ACTION BUTTON ===== */}
      <div className="pt-3 anim-slide" style={{ animationDelay: '0.4s' }}>
        <button
          onClick={() => {
            // Go back online — the socket hook persists it to the DB + joins the pool.
            dispatch(setOnline(true))
            navigate('/orders')
          }}
          className="w-full h-12 bg-primary hover:bg-surface-tint active:scale-[0.98] text-on-primary font-bold text-label-lg rounded-2xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-primary/20 cursor-pointer"
        >
          <span>Back to Available Orders</span>
          <Icon name="arrow_forward" className="text-[18px]" />
        </button>
      </div>
    </div>
  )
}