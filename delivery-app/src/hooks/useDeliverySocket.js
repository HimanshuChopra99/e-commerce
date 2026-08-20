import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getSocket, connectSocket } from '../lib/socket'
import {
  setConnectionState,
  orderBroadcasted,
  orderTakenAway,
  setWarehouseLocation,
} from '../store/slices/orderSlice'
import { setOnline } from '../store/slices/appSlice'

/**
 * Call this hook once in the root App component.
 * It handles:
 *   - Connecting when partner logs in
 *   - Joining delivery:pool when they go online
 *   - Listening for order broadcasts from admin
 *   - Leaving pool when another partner takes an order
 */
export function useDeliverySocket() {
  const dispatch = useDispatch()
  const partner  = useSelector(s => s.app.partner)
  const online   = useSelector(s => s.app.online)
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!partner) return

    const socket = connectSocket(partner.publicId)

    socket.on('connect', () => {
      connectedRef.current = true
      dispatch(setConnectionState('connected'))
    })

    socket.on('disconnect', () => {
      connectedRef.current = false
      dispatch(setConnectionState('disconnected'))
      dispatch(setOnline(false))
    })

    socket.on('order:ready_for_pickup', (data) => {
      dispatch(orderBroadcasted(data))
    })

    socket.on('order:assigned_away', (data) => {
      dispatch(orderTakenAway(data))
    })

    socket.on('warehouse:location', (data) => {
      if (data) dispatch(setWarehouseLocation(data))
    })

    socket.on('warehouse:location_updated', (data) => {
      if (data) dispatch(setWarehouseLocation(data))
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('order:ready_for_pickup')
      socket.off('order:assigned_away')
      socket.off('warehouse:location')
      socket.off('warehouse:location_updated')
    }
  }, [partner, dispatch])

  // When online toggle changes, join or leave the pool room
  useEffect(() => {
    if (!partner) return
    const socket = getSocket()
    if (online) {
      socket.emit('delivery:go_online', { partnerPublicId: partner.publicId })
    } else {
      socket.emit('delivery:go_offline', { partnerPublicId: partner.publicId })
    }
  }, [online, partner])
}
