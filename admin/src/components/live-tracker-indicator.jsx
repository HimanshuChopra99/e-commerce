import { useEffect, useState } from 'react'
import { Radio, Truck, X, Navigation } from 'lucide-react'
import { adminTracker } from '@/services/admin-tracker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function LiveTrackerIndicator() {
  const [trackerState, setTrackerState] = useState(() => adminTracker.getState())
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    return adminTracker.subscribe((state) => {
      setTrackerState(state)
    })
  }, [])

  if (!trackerState.isWatching && trackerState.count === 0) {
    return null
  }

  const trackingList = trackerState.activeTrackingNumbers || []
  const coords = trackerState.lastCoords

  return (
    <div className='fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2'>
      {/* Expanded Details Popover */}
      {isExpanded && (
        <div className='w-80 rounded-xl border bg-card p-4 text-card-foreground shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200'>
          <div className='flex items-center justify-between pb-2 border-b'>
            <div className='flex items-center gap-2'>
              <Radio className='size-4 text-emerald-500 animate-pulse' />
              <span className='font-bold text-sm'>Live GPS Broadcast</span>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='size-6 rounded-full'
              onClick={() => setIsExpanded(false)}
            >
              <X className='size-3.5' />
            </Button>
          </div>

          <div className='py-3 space-y-2 text-xs'>
            <div className='flex justify-between items-center text-muted-foreground'>
              <span>Socket Status:</span>
              <Badge variant={trackerState.socketConnected ? 'default' : 'secondary'} className='text-[10px] h-5'>
                {trackerState.socketConnected ? 'Connected' : 'Connecting…'}
              </Badge>
            </div>

            {coords ? (
              <div className='rounded-lg bg-muted/60 p-2 space-y-1 font-mono text-[11px]'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Lat:</span>
                  <span className='font-semibold'>{coords.latitude?.toFixed(6)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Lng:</span>
                  <span className='font-semibold'>{coords.longitude?.toFixed(6)}</span>
                </div>
                {coords.accuracy && (
                  <div className='flex justify-between text-[10px] text-muted-foreground'>
                    <span>Accuracy:</span>
                    <span>±{Math.round(coords.accuracy)}m</span>
                  </div>
                )}
              </div>
            ) : (
              <p className='text-muted-foreground italic text-center py-1'>Acquiring GPS fix…</p>
            )}

            <div className='space-y-1 pt-1'>
              <span className='text-[11px] font-semibold text-muted-foreground'>
                Active Tracking Shipments ({trackingList.length}):
              </span>
              <div className='max-h-28 overflow-y-auto space-y-1 pr-1'>
                {trackingList.map((tNum) => (
                  <div
                    key={tNum}
                    className='flex items-center justify-between rounded bg-muted/40 px-2 py-1 text-[11px]'
                  >
                    <span className='font-mono truncate max-w-[170px]'>{tNum}</span>
                    <button
                      type='button'
                      onClick={() => adminTracker.stopTracking(tNum)}
                      className='text-muted-foreground hover:text-destructive'
                      title='Stop tracking this shipment'
                    >
                      <X className='size-3' />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className='pt-2 border-t flex justify-end gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='text-xs h-7 text-destructive hover:bg-destructive/10'
              onClick={() => adminTracker.clearAllTracking()}
            >
              Stop All Broadcasts
            </Button>
          </div>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        type='button'
        onClick={() => setIsExpanded((prev) => !prev)}
        className='flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/90 text-emerald-300 backdrop-blur-md px-3.5 py-2 text-xs font-semibold shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-900 active:scale-95'
      >
        <span className='relative flex size-2'>
          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75'></span>
          <span className='relative inline-flex size-2 rounded-full bg-emerald-500'></span>
        </span>
        <Truck className='size-3.5 text-emerald-400' />
        <span>GPS Live ({trackingList.length})</span>
        <Navigation className='size-3 text-emerald-400/80 ml-0.5' />
      </button>
    </div>
  )
}
