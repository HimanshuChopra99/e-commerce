/**
 * use-admin-order-socket.js
 *
 * React hook that:
 * 1. Subscribes to real-time socket updates for a specific order (by orderId)
 * 2. Listens for Phase-1 partner location (delivery:partner_location)
 * 3. Listens for Phase-2 partner location via tracking room (tracking:update)
 * 4. Listens for status changes (order:status_changed, order:phase_changed)
 * 5. Returns live partner position + current phase so admin map can render it
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
  const [partnerPos, setPartnerPos] = useState(null) // [lat, lng]
  const [phase, setPhase] = useState(null) // 'to_warehouse' | 'to_customer'
  const [liveStatus, setLiveStatus] = useState(initialStatus ?? null)
  const trackingRoomRef = useRef(null)

  // Sync initialStatus if it changes
  useEffect(() => {
    if (initialStatus) setLiveStatus(initialStatus)
  }, [initialStatus])

  // Helper: subscribe to tracking room for Phase-2 updates
  const subscribeToTracking = useCallback((tNum) => {
    if (!tNum || trackingRoomRef.current === tNum) return
    trackingRoomRef.current = tNum
    const socket = adminTracker.socket
    if (socket) {
      socket.emit('tracking:subscribe', { trackingNumber: tNum })
    }
  }, [])

  const unsubscribeFromTracking = useCallback((tNum) => {
    if (!tNum) return
    const socket = adminTracker.socket
    if (socket) {
      socket.emit('tracking:unsubscribe', { trackingNumber: tNum })
    }
    trackingRoomRef.current = null
  }, [])

  useEffect(() => {
    if (!orderId) return

    const socket = adminTracker.socket
    if (!socket) return

    // Watch this specific order for per-order broadcasts
    socket.emit('admin:watch_order', { orderId })

    // ── Handler: Phase 1 — partner heading to warehouse ──────────────────────
    const onPhase1Location = (data) => {
      if (data.orderId !== orderId) return
      setPartnerPos([data.lat, data.lng])
      setPhase(data.phase || 'to_warehouse')
    }

    // ── Handler: Phase 2 — partner heading to customer ────────────────────────
    const onTrackingUpdate = (data) => {
      if (data.lat && data.lng) {
        setPartnerPos([data.lat, data.lng])
        setPhase('to_customer')
      }
    }

    // ── Handler: Status changed (assigned, shipping, delivered) ───────────────
    const onStatusChanged = (data) => {
      if (data.orderId !== orderId) return
      console.log(
        '[useAdminOrderSocket] order status changed live:',
        data.status
      )
      setLiveStatus(data.status)
      dispatch(
        orderStatusUpdated({
          orderId,
          status: data.status,
          partnerName: data.partnerName,
        })
      )
    }

    // ── Handler: Phase changed (to_customer after pickup / delivered on completion) ─────
    const onPhaseChanged = (data) => {
      if (data.orderId !== orderId) return
      setPhase(data.phase)
      const nextStatus =
        data.phase === 'delivered'
          ? 'delivered'
          : data.phase === 'to_customer' || data.phase === 'shipping'
            ? 'shipping'
            : 'assigned'
      setLiveStatus(nextStatus)
      if (data.trackingNumber) {
        subscribeToTracking(data.trackingNumber)
      }
    }

    // ── Handler: receive-location (global echo from server) ───────────────────
    const onReceiveLocation = (data) => {
      if (
        trackingRoomRef.current &&
        data.trackingNumbers?.includes(trackingRoomRef.current)
      ) {
        if (data.lat && data.lng) {
          setPartnerPos([data.lat, data.lng])
        }
      }
    }

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
      socket.off('delivery:partner_location', onPhase1Location)
      socket.off('tracking:update', onTrackingUpdate)
      socket.off('order:status_changed', onStatusChanged)
      socket.off('order:phase_changed', onPhaseChanged)
      socket.off('receive-location', onReceiveLocation)
      if (trackingRoomRef.current) {
        unsubscribeFromTracking(trackingRoomRef.current)
      }
    }
  }, [
    orderId,
    trackingNumber,
    dispatch,
    subscribeToTracking,
    unsubscribeFromTracking,
  ])

  useEffect(() => {
    if (trackingNumber) {
      subscribeToTracking(trackingNumber)
    }
  }, [trackingNumber, subscribeToTracking])

  return { partnerPos, phase, liveStatus }
}
