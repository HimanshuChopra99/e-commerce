import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Icon from '../components/Icon'
import OrderCard from '../components/OrderCard'
import {
  selectAvailableOrders,
  setAvailableOrders,
  acceptOrderSuccess,
  orderTakenAway,
} from '../store/slices/orderSlice'
import { getSocket } from '../lib/socket'
import { api } from '../lib/api'

export default function Orders() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const token    = useSelector((s) => s.app.token)
  const partner  = useSelector((s) => s.app.partner)
  const orders   = useSelector(selectAvailableOrders)
  const [loading, setLoading] = useState(false)

  // Fetch all currently available (ready_for_pickup) orders from backend
  const fetchOrders = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await api.get('/delivery-partner/orders/available', token)
      if (Array.isArray(data)) {
        dispatch(setAvailableOrders(data))
      }
    } catch (err) {
      console.warn('Failed to load available orders:', err)
    } finally {
      setLoading(false)
    }
  }, [token, dispatch])

  // On mount: ensure delivery partner is joined to pool & fetch latest orders
  useEffect(() => {
    const socket = getSocket()
    if (partner?.publicId) {
      socket.emit('delivery:go_online', { partnerPublicId: partner.publicId })
    }
    fetchOrders()
  }, [partner, fetchOrders])

  const handleAccept = async (orderId) => {
    try {
      const order = await api.post(`/delivery-partner/orders/${orderId}/accept`, {}, token)
      dispatch(acceptOrderSuccess(order))

      // Leave pool during active delivery
      const socket = getSocket()
      if (partner?.publicId) {
        socket.emit('delivery:go_offline', { partnerPublicId: partner.publicId })
      }

      navigate('/tracking')
    } catch (err) {
      alert(err.message || 'Order could not be accepted')
    }
  }

  const handleReject = (orderId) => {
    dispatch(orderTakenAway({ orderId }))
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md flex flex-col antialiased">
      {/* TopAppBar */}
      <header className="flex justify-between items-center w-full px-margin-mobile h-14 bg-surface dark:bg-on-background docked full-width top-0 sticky z-40 transition-all duration-200">
        <button
          onClick={() => navigate(-1)}
          className="text-on-surface-variant dark:text-outline-variant hover:bg-surface-container-low dark:hover:bg-surface-variant p-2 rounded-full transition-colors active:opacity-70 flex items-center justify-center"
        >
          <Icon name="arrow_back" />
        </button>
        <h1 className="text-headline-md font-bold text-on-surface dark:text-on-background text-primary dark:text-primary-fixed-dim">
          Orders
        </h1>
        <button
          onClick={fetchOrders}
          disabled={loading}
          title="Refresh orders"
          className="text-on-surface-variant dark:text-outline-variant hover:bg-surface-container-low dark:hover:bg-surface-variant p-2 rounded-full transition-colors active:opacity-70 flex items-center justify-center"
        >
          <Icon name="refresh" className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto pb-28 px-margin-mobile flex flex-col gap-md pt-sm relative z-10">
        {/* Orders list */}
        <div className="flex flex-col gap-sm">
          {!orders || orders.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl p-lg text-center border border-surface-container-highest">
              <Icon name="inbox" className="text-outline text-3xl mx-auto mb-sm" />
              <p className="text-body-lg text-on-surface font-semibold">No orders here</p>
              <p className="text-body-md text-on-surface-variant">When you accept an order, it will show up here.</p>
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}
