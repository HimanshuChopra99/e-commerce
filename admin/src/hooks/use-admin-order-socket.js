/**
 * use-admin-order-socket.js
 *
 * React hook that:
 * 1. Subscribes to real-time socket updates for a specific order (by orderId)
 * 2. Listens for Phase-1 partner location (delivery:partner_location)
 * 3. Listens for Phase-2 partner location via tracking room (tracking:update)
 * 4. Listens for status changes (order:status_changed, order:phase_changed)
 * 5. Uses derived state & socket override pattern to eliminate linter warnings
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { orderStatusUpdated } from '@/store/adminOrdersSlice'
import { adminTracker } from '@/services/admin-tracker'

export function useAdminOrderSocket({
  orderId,
  trackingNumber,
  initialStatus,
} = {}) {
  const dispatch = useDispatch()
  const [prevOrderId, setPrevOrderId] = useState(orderId)
  const [partnerPos, setPartnerPos] = useState(null) // [lat, lng]
  const [phase, setPhase] = useState(null) // 'to_warehouse' | 'to_customer'
  const [socketStatus, setSocketStatus] = useState(null)
  const trackingRoomRef = useRef(null)

  // React-recommended pattern for resetting state on prop change without effects
  if (prevOrderId !== orderId) {
    setPrevOrderId(orderId)
    setPartnerPos(null)
    setPhase(null)
    setSocketStatus(null)
  }

  // FIX #4: Derived state replaces the previous useEffect that called
  // setLiveStatus(initialStatus) synchronously inside an effect body.
  // That pattern caused cascading renders every time initialStatus changed.
  // Now liveStatus is computed inline on every render at zero extra cost:
  //   - socketStatus holds any live update pushed from the server via socket.
  //   - When no socket update has arrived yet (socketStatus is null), we fall
  //     back to the initialStatus prop passed in from Redux / the API response.
  //   - This means the displayed status is always correct on first mount AND
  //     updates instantly when the server pushes a new status — no effect needed.
  const liveStatus = socketStatus ?? initialStatus ?? null

  // Helper: subscribe to tracking room for Phase-2 updates
  const subscribeToTracking = useCallback((tNum) => {
    if (!tNum) return
    const socket = adminTracker.socket
    if (!socket) return

    if (trackingRoomRef.current && trackingRoomRef.current !== tNum) {
      socket.emit('tracking:unsubscribe', {
        trackingNumber: trackingRoomRef.current,
      })
    }

    trackingRoomRef.current = tNum
    socket.emit('tracking:subscribe', { trackingNumber: tNum })
  }, [])

  const unsubscribeFromTracking = useCallback(() => {
    if (!trackingRoomRef.current) return
    const socket = adminTracker.socket
    if (socket) {
      socket.emit('tracking:unsubscribe', {
        trackingNumber: trackingRoomRef.current,
      })
    }
    trackingRoomRef.current = null
  }, [])

  useEffect(() => {
    if (!orderId) return

    const socket = adminTracker.socket
    if (!socket) return

    // Watch this specific order for per-order broadcasts
    socket.emit('admin:watch_order', { orderId })

    // Auto-rejoin rooms on reconnect
    const onConnect = () => {
      socket.emit('admin:watch_order', { orderId })
      if (trackingRoomRef.current) {
        socket.emit('tracking:subscribe', {
          trackingNumber: trackingRoomRef.current,
        })
      }
    }

    // Phase 1: partner heading to warehouse
    const onPhase1Location = (data) => {
      if (data?.orderId !== orderId) return
      if (data.lat != null && data.lng != null) {
        setPartnerPos([Number(data.lat), Number(data.lng)])
      }
      setPhase(data.phase || 'to_warehouse')
    }

    // Phase 2: partner heading to customer
    const onTrackingUpdate = (data) => {
      if (
        data?.trackingNumber &&
        trackingRoomRef.current &&
        data.trackingNumber !== trackingRoomRef.current
      ) {
        return
      }

      if (data?.lat != null && data?.lng != null) {
        setPartnerPos([Number(data.lat), Number(data.lng)])
        setPhase('to_customer')
      }
    }

    // Status changed (assigned, shipping, delivered)
    const onStatusChanged = (data) => {
      if (data?.orderId !== orderId) return
      setSocketStatus(data.status)
      dispatch(
        orderStatusUpdated({
          orderId,
          status: data.status,
          partnerName: data.partnerName,
        })
      )
    }

    // Phase changed (to_customer after pickup / delivered on completion)
    const onPhaseChanged = (data) => {
      if (data?.orderId !== orderId) return
      setPhase(data.phase)

      const nextStatus =
        data.phase === 'delivered'
          ? 'delivered'
          : data.phase === 'to_customer' || data.phase === 'shipping'
            ? 'shipping'
            : 'assigned'

      setSocketStatus(nextStatus)

      dispatch(
        orderStatusUpdated({
          orderId,
          status: nextStatus,
          partnerName: data.partnerName,
        })
      )

      if (data.trackingNumber) {
        subscribeToTracking(data.trackingNumber)
      }
    }

    // Global echo from server
    const onReceiveLocation = (data) => {
      if (
        trackingRoomRef.current &&
        data?.trackingNumbers?.includes(trackingRoomRef.current)
      ) {
        if (data.lat != null && data.lng != null) {
          setPartnerPos([Number(data.lat), Number(data.lng)])
        }
      }
    }

    socket.on('connect', onConnect)
    socket.on('delivery:partner_location', onPhase1Location)
    socket.on('tracking:update', onTrackingUpdate)
    socket.on('order:status_changed', onStatusChanged)
    socket.on('order:phase_changed', onPhaseChanged)
    socket.on('receive-location', onReceiveLocation)

    if (trackingNumber) {
      subscribeToTracking(trackingNumber)
    }

    return () => {
      socket.emit('admin:unwatch_order', { orderId })
      socket.off('connect', onConnect)
      socket.off('delivery:partner_location', onPhase1Location)
      socket.off('tracking:update', onTrackingUpdate)
      socket.off('order:status_changed', onStatusChanged)
      socket.off('order:phase_changed', onPhaseChanged)
      socket.off('receive-location', onReceiveLocation)
      unsubscribeFromTracking()
    }
  }, [
    orderId,
    trackingNumber,
    dispatch,
    subscribeToTracking,
    unsubscribeFromTracking,
  ])

  return { partnerPos, phase, liveStatus }
}