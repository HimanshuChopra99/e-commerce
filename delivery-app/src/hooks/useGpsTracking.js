import { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { getSocket } from '../lib/socket'
import { selectTrackingNumber, selectActiveOrder, selectNavPhase } from '../store/slices/orderSlice'

const PING_INTERVAL_MS = 3000

/**
 * Continuously broadcasts the partner's GPS position:
 *
 * Phase 1 (to_warehouse — heading to warehouse before pickup):
 *   Emits `send-location` so server echoes receive-location for local map
 *   Emits `delivery:partner_location` { orderId, lat, lng, phase } to server/admin
 *
 * Phase 2 (to_customer — tracking number assigned after pickup):
 *   Emits `send-location` { lat, lng, trackingNumbers }
 *   Server saves pings, updates tracking session, fans out to tracking room.
 */
export function useGpsTracking() {
  const trackingNumber = useSelector(selectTrackingNumber)
  const activeOrder    = useSelector(selectActiveOrder)
  const navPhase       = useSelector(selectNavPhase)
  const intervalRef    = useRef(null)

  useEffect(() => {
    const hasActiveDelivery = Boolean(activeOrder && navPhase)
    if (!hasActiveDelivery) {
      clearInterval(intervalRef.current)
      return
    }

    const orderId = activeOrder.id || activeOrder.publicId

    const emitLocation = () => {
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const socket = getSocket()
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude

          if (trackingNumber) {
            // Phase 2: partner has picked up, emit with tracking number
            socket.emit('send-location', {
              latitude: lat,
              longitude: lng,
              trackingNumbers: [trackingNumber],
            })
          } else if (navPhase === 'to_warehouse') {
            // Phase 1: partner heading to warehouse
            socket.emit('send-location', {
              latitude: lat,
              longitude: lng,
              trackingNumbers: [],
            })
            socket.emit('delivery:partner_location', {
              orderId,
              lat,
              lng,
              phase: 'to_warehouse',
            })
          }
        },
        null,
        { enableHighAccuracy: true, timeout: 5000 }
      )
    }

    emitLocation()
    intervalRef.current = setInterval(emitLocation, PING_INTERVAL_MS)

    return () => clearInterval(intervalRef.current)
  }, [trackingNumber, activeOrder, navPhase])
}
