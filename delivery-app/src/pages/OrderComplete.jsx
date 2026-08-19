import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Icon from '../components/Icon'
import { selectCompletedOrder } from '../store/slices/orderSlice'

export default function OrderComplete() {
  const navigate = useNavigate()
  const location = useLocation()
  const reduxCompletedOrder = useSelector(selectCompletedOrder)

  // Data recovery: Checks location state first, then Redux fallback
  const order = location.state?.order || reduxCompletedOrder

  // Safe normalized fallback data
  const orderId = order?.id || 'ORD-8924A'
  const payout = order?.payout || order?.amount || '$12.50'
  const duration = order?.duration || order?.eta || '15 min'
  const distance = order?.distance || '2.4 mi'
  const pickupLabel = order?.pickup?.label || order?.store || 'Bistro Cafe Downtown'
  const pickupAddress = order?.pickup?.address || '124 Main Street'
  const dropoffLabel = order?.dropoff?.label || 'Tech Campus Bldg 4'
  const dropoffAddress = order?.dropoff?.address || order?.address || '400 Silicon Blvd'

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
            className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase shadow-2xs mb-2 anim-slide"
            style={{ animationDelay: '0.08s' }}
          >
            <Icon name="check_circle" fill className="text-[14px] text-emerald-600" />
            <span>Delivered Successfully</span>
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
            Order #{orderId} · Great work! 🎉
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
              Successfully credited for this trip
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
                Route Details
              </h2>
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
              Completed
            </span>
          </div>

          <div className="relative pl-7 py-0.5">
            {/* Smooth Connecting Line */}
            <div className="absolute left-[11px] top-2.5 bottom-2.5 w-[2px] bg-gradient-to-b from-outline-variant/60 via-primary/50 to-primary" />

            {/* Pickup Node */}
            <div className="relative mb-4">
              <div className="absolute -left-[27px] top-0.5 w-5 h-5 rounded-full bg-surface-container border-2 border-surface-container-lowest flex items-center justify-center z-10 shadow-2xs">
                <Icon name="storefront" className="text-[11px] text-on-surface-variant" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider">Pickup</span>
                <span className="text-body-md font-bold text-on-surface truncate">{pickupLabel}</span>
                <span className="text-label-sm text-on-surface-variant truncate mt-0.5">{pickupAddress}</span>
              </div>
            </div>

            {/* Drop-off Node */}
            <div className="relative">
              <div className="absolute -left-[27px] top-0.5 w-5 h-5 rounded-full bg-primary border-2 border-surface-container-lowest flex items-center justify-center z-10 shadow-2xs">
                <Icon name="check" className="text-[11px] text-on-primary font-bold" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Drop-off</span>
                <span className="text-body-md font-bold text-on-surface truncate">{dropoffLabel}</span>
                <span className="text-label-sm text-on-surface-variant truncate mt-0.5">{dropoffAddress}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ===== 5. ACTION BUTTON ===== */}
      <div className="pt-3 anim-slide" style={{ animationDelay: '0.4s' }}>
        <button
          onClick={() => navigate('/orders')}
          className="w-full h-12 bg-primary hover:bg-surface-tint active:scale-[0.98] text-on-primary font-bold text-label-lg rounded-2xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-primary/20"
        >
          <span>Back to Orders</span>
          <Icon name="arrow_forward" className="text-[18px]" />
        </button>
      </div>
    </div>
  )
}