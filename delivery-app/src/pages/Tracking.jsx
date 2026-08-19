import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Icon from '../components/Icon'
import LiveMap from '../components/LiveMap'
import { selectActiveOrder, completeActiveOrder } from '../store/slices/orderSlice'

export default function Tracking() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const order = useSelector(selectActiveOrder)
  const [open, setOpen] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Guard: If no active order and not completing, redirect to orders
  if (!order && !isCompleting) {
    return <Navigate to="/orders" replace />
  }

  const handleComplete = () => {
    setIsCompleting(true)
    dispatch(completeActiveOrder())
    navigate('/order-complete', { replace: true })
  }

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background text-on-background relative">
      {/* ===== TopAppBar ===== */}
      <header className="flex justify-between items-center w-full px-margin-mobile h-14 bg-surface/95 backdrop-blur dark:bg-on-background z-20 relative border-b border-surface-container-highest shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant transition-all duration-200 active:opacity-70 text-on-surface-variant dark:text-outline-variant"
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="text-headline-md font-bold text-on-surface dark:text-on-background flex-1 text-center">
          Live Tracking
        </h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant transition-all duration-200 active:opacity-70 text-on-surface-variant dark:text-outline-variant">
          <Icon name="more_horiz" />
        </button>
      </header>

      {/* ===== Map ===== */}
      <div className="flex-1 relative z-0 min-h-0">
        <LiveMap open={open} />

        {/* Custom map controls */}
        <div className="absolute right-margin-mobile top-margin-mobile flex flex-col gap-sm z-[1000]">
          <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors">
            <Icon name="my_location" />
          </button>
          <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors">
            <Icon name="layers" />
          </button>
        </div>

        {/* Live status chip */}
        <div className="absolute left-margin-mobile top-margin-mobile z-[1000] bg-surface-container-lowest/90 backdrop-blur-md px-sm py-1.5 rounded-full border border-surface-container-highest shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-label-sm font-semibold text-primary">Live</span>
        </div>
      </div>

      {/* ===== Bottom Sheet ===== */}
      <div className="relative z-20 w-full bg-surface-container-lowest rounded-t-[24px] shadow-[0px_-4px_24px_rgba(0,0,0,0.10)] shrink-0">
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle delivery details"
          className="w-full flex justify-center pt-2.5 pb-1.5 active:opacity-70 transition-transform duration-200 active:scale-x-95"
        >
          <div className="w-10 h-1 bg-outline-variant rounded-full"></div>
        </button>

        {/* Collapsed summary */}
        <button
          onClick={() => setOpen(true)}
          className={`w-full px-margin-mobile text-left transition-all duration-300 ease-in-out ${
            open ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-24 pb-4'
          }`}
        >
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <Icon name="two_wheeler" fill className="text-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body-lg font-bold text-on-surface truncate">TRK{order?.id}</p>
              <p className="text-label-sm text-primary font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> In Transit
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-label-sm text-on-surface-variant">
                ETA <span className="font-bold text-on-surface">{order?.eta}</span>
              </span>
              <span className="text-label-sm text-on-surface-variant">
                Payout <span className="font-bold text-primary">{order?.payout}</span>
              </span>
            </div>
          </div>
        </button>

        {/* Expanded content */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-margin-mobile pb-5">
              <div className="flex flex-col gap-md">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center shrink-0">
                    <Icon name="two_wheeler" fill className="text-primary text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-headline-md text-on-surface mb-0.5">TRK{order?.id}</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-body-md text-on-surface-variant">In Transit</span>
                    </div>
                  </div>
                </div>

                <hr className="border-outline-variant opacity-30" />

                <div className="grid grid-cols-3 gap-xs text-center">
                  <div className="flex flex-col">
                    <span className="text-label-sm text-outline mb-1">Estimated Time</span>
                    <span className="text-body-lg text-on-surface font-bold">{order?.eta}</span>
                  </div>
                  <div className="flex flex-col border-l border-r border-outline-variant border-opacity-30">
                    <span className="text-label-sm text-outline mb-1">Distance Left</span>
                    <span className="text-body-lg text-on-surface font-bold">{order?.distance}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-label-sm text-outline mb-1">Payout</span>
                    <span className="text-body-lg text-primary font-bold">{order?.payout}</span>
                  </div>
                </div>

                <div className="bg-surface-container-low rounded-2xl p-sm flex flex-col gap-xs">
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">storefront</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-label-sm text-on-surface-variant uppercase">Pickup</span>
                      <span className="text-body-md text-on-surface font-semibold truncate">{order?.pickup?.label}</span>
                    </div>
                  </div>
                  <div className="border-l-2 border-outline-variant ml-4 h-3"></div>
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-label-sm text-primary uppercase">Drop-off</span>
                      <span className="text-body-md text-on-surface font-semibold truncate">{order?.dropoff?.label}</span>
                    </div>
                  </div>
                </div>

                {/* Complete delivery button */}
                <button
                  onClick={handleComplete}
                  className="w-full h-12 bg-primary text-on-primary rounded-full flex items-center justify-center gap-xs hover:bg-surface-tint transition-colors shadow-md active:scale-95 duration-150"
                >
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <span className="text-label-lg">Complete Delivery</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}