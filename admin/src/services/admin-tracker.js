/**
 * admin-tracker.js
 * Place at: admin/src/services/admin-tracker.js
 *
 * Persistent singleton manager for courier/admin geolocation broadcasting.
 * Runs `navigator.geolocation.watchPosition` at the application level so that
 * when an admin leaves the order page or browses elsewhere in the admin panel,
 * live location transmission continues uninterrupted.
 */
import { io } from 'socket.io-client'
import { store } from '../store'
import { orderStatusUpdated } from '../store/adminOrdersSlice'

const STORAGE_KEY = 'kick_admin_active_trackings'

class AdminTracker {
  constructor() {
    this.socket = null
    this.watchId = null
    this.activeTrackingNumbers = new Set(this._loadPersistedTrackings())
    this.lastCoords = null
    this.lastPingAt = null
    this.listeners = new Set()
    this.isWatching = false

    this._initSocket()
    if (this.activeTrackingNumbers.size > 0) {
      this.startBroadcasting()
    }
  }

  _loadPersistedTrackings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // Ignore
    }
    return []
  }

  _savePersistedTrackings() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(this.activeTrackingNumbers))
      )
    } catch {
      // Ignore
    }
  }

  _initSocket() {
    if (this.socket) return
    const apiBase = import.meta.env.VITE_API_URL || '/api'
    const socketUrl = apiBase.includes('http')
      ? apiBase.replace('/api', '')
      : 'http://localhost:4000'

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    })

    this.socket.on('connect', () => {
      console.log('[AdminTracker] Socket connected:', this.socket.id)
      this.socket.emit('admin:join')

      // Sync Admin's current location as Warehouse location
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (this.socket && this.socket.connected) {
              this.socket.emit('admin:set_warehouse_location', {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                address: 'KICKS Main Hub',
              })
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        )
      }

      this._notifyListeners()
    })

    this.socket.on(
      'order:status_changed',
      ({ orderId, status, partnerName }) => {
        console.log('[AdminTracker] order:status_changed', {
          orderId,
          status,
          partnerName,
        })
        store.dispatch(orderStatusUpdated({ orderId, status, partnerName }))
      }
    )

    this.socket.on(
      'order:phase_changed',
      ({ orderId, phase, trackingNumber }) => {
        console.log('[AdminTracker] order:phase_changed', {
          orderId,
          phase,
          trackingNumber,
        })
        const status =
          phase === 'delivered'
            ? 'delivered'
            : phase === 'to_customer' || phase === 'shipping'
              ? 'shipping'
              : 'assigned'
        store.dispatch(orderStatusUpdated({ orderId, status, trackingNumber }))
      }
    )

    this.socket.on('order:shipping', ({ orderId, trackingNumber }) => {
      store.dispatch(
        orderStatusUpdated({ orderId, status: 'shipping', trackingNumber })
      )
    })

    this.socket.on('order:delivered', ({ orderId }) => {
      store.dispatch(orderStatusUpdated({ orderId, status: 'delivered' }))
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[AdminTracker] Socket disconnected:', reason)
      this._notifyListeners()
    })
  }

  /**
   * Add a tracking number to the active broadcast list
   */
  startTracking(trackingNumber) {
    if (!trackingNumber) return
    const trimmed = String(trackingNumber).trim()
    if (!trimmed) return

    this.activeTrackingNumbers.add(trimmed)
    this._savePersistedTrackings()
    this.startBroadcasting()
    this._notifyListeners()
  }

  /**
   * Remove a tracking number from active broadcast list
   */
  stopTracking(trackingNumber) {
    if (!trackingNumber) return
    const trimmed = String(trackingNumber).trim()
    this.activeTrackingNumbers.delete(trimmed)
    this._savePersistedTrackings()

    if (this.activeTrackingNumbers.size === 0) {
      this.stopBroadcasting()
    }
    this._notifyListeners()
  }

  /**
   * Clear all tracked shipments
   */
  clearAllTracking() {
    this.activeTrackingNumbers.clear()
    this._savePersistedTrackings()
    this.stopBroadcasting()
    this._notifyListeners()
  }

  /**
   * Start high-accuracy geolocation watch
   */
  startBroadcasting() {
    if (
      this.isWatching ||
      typeof window === 'undefined' ||
      !navigator.geolocation
    ) {
      return
    }

    this._initSocket()
    this.isWatching = true

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } =
          position.coords
        console.log(longitude, latitude)

        this.lastCoords = { latitude, longitude, accuracy, speed, heading }
        this.lastPingAt = new Date().toISOString()

        const trackingNumbers = Array.from(this.activeTrackingNumbers)

        // 1. Emit real-time socket event as required
        if (this.socket && this.socket.connected) {
          this.socket.emit('send-location', {
            latitude,
            longitude,
            lat: latitude,
            lng: longitude,
            trackingNumbers,
            trackingNumber: trackingNumbers[0] || null,
          })
        }

        // 2. Also send HTTP pings to persist in database/Redis
        const token = localStorage.getItem('kick_admin_access_token')
        const apiBase = import.meta.env.VITE_API_URL || '/api'
        for (const tNum of trackingNumbers) {
          fetch(`${apiBase}/tracking/${encodeURIComponent(tNum)}/ping`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          }).catch((err) => {
            console.debug('[AdminTracker] HTTP ping fallback error:', err)
          })
        }

        this._notifyListeners()
      },
      (error) => {
        console.error('[AdminTracker] Geolocation error:', error)
        this._notifyListeners()
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )

    this._notifyListeners()
  }

  /**
   * Stop geolocation watch
   */
  stopBroadcasting() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
    this.isWatching = false
    this._notifyListeners()
  }

  getState() {
    return {
      isWatching: this.isWatching,
      activeTrackingNumbers: Array.from(this.activeTrackingNumbers),
      count: this.activeTrackingNumbers.size,
      lastCoords: this.lastCoords,
      lastPingAt: this.lastPingAt,
      socketConnected: Boolean(this.socket?.connected),
    }
  }

  subscribe(callback) {
    this.listeners.add(callback)
    callback(this.getState())
    return () => this.listeners.delete(callback)
  }

  _notifyListeners() {
    const state = this.getState()
    for (const listener of this.listeners) {
      try {
        listener(state)
      } catch (err) {
        console.warn('Listener error in AdminTracker:', err)
      }
    }
  }
}

export const adminTracker = new AdminTracker()
export default adminTracker
