import { Server } from 'socket.io'
import { logger } from '../config/logger.js'
import { env } from '../config/env.js'
import { setPageState, setCallId, getPageState } from '../services/session-state.service.js'
import { syncRetellState } from '../services/retell-sync.service.js'
import * as trackingService from '../services/tracking.service.js'
import { haversineMeters } from '../controllers/tracking.controller.js'

let io

export function initSocket(httpServer) {
  const allowedOrigins = [
    ...(env.corsOrigins || []),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]

  io = new Server(httpServer, {
    transports: ['websocket', 'polling'],
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }
        return callback(null, true) // In development, allow all origins
      },
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId || 'guest'
    const room = `user:${userId}`

    socket.join(room)
    logger.info({ socketId: socket.id, userId, room }, '[Socket] client connected')

    // ── Live Tracking Subscriptions ──────────────────────────────────────────
    socket.on('tracking:subscribe', (data) => {
      const trackingNumber = typeof data === 'string' ? data : data?.trackingNumber
      if (trackingNumber) {
        const trackingRoom = `tracking:${trackingNumber}`
        socket.join(trackingRoom)
        logger.info({ socketId: socket.id, trackingNumber, trackingRoom }, '[Socket] client joined tracking room')
      }
    })

    // ── Add this inside io.on('connection', (socket) => { ... }) ──

socket.on('send-delivery-completed', async (data) => {
  const trackingNumber = typeof data === 'string' ? data : data?.trackingNumber
  if (!trackingNumber) return

  try {
    // ✅ Use completeSession instead of updateStatus
    await trackingService.completeSession(trackingNumber)

    const trackingRoom = `tracking:${trackingNumber}`
    io.to(trackingRoom).emit('tracking:completed', { trackingNumber })

    logger.info({ socketId: socket.id, trackingNumber }, '[Socket] Parcel marked as delivered')
  } catch (err) {
    logger.warn({ err: err.message, trackingNumber }, '[Socket] Failed to mark completed')
  }
})
    socket.on('tracking:unsubscribe', (data) => {
      const trackingNumber = typeof data === 'string' ? data : data?.trackingNumber
      if (trackingNumber) {
        const trackingRoom = `tracking:${trackingNumber}`
        socket.leave(trackingRoom)
        logger.info({ socketId: socket.id, trackingNumber, trackingRoom }, '[Socket] client left tracking room')
      }
    })

    // ── Live Geolocation Broadcasting (Admin / Courier) ──────────────────────
    socket.on('send-location', async (data) => {
      if (!data) return
      const latitude = Number.parseFloat(data.latitude ?? data.lat)
      const longitude = Number.parseFloat(data.longitude ?? data.lng)

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return
      }

      console.log('Location received:', longitude, latitude)

      const trackingNumbers = Array.isArray(data.trackingNumbers)
        ? data.trackingNumbers.filter(Boolean)
        : data.trackingNumber
          ? [data.trackingNumber]
          : []

      const at = new Date().toISOString()

      // Broadcast generic receive-location for any global listener
      io.emit('receive-location', {
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        trackingNumbers,
        at,
      })

      for (const tNum of trackingNumbers) {
        try {
          const ping = await trackingService.savePing(tNum, latitude, longitude)
          const session = await trackingService.getTrackingSession(tNum)
          const destination = session?.destination ?? {}

          const distanceMeters =
            Number.isFinite(destination.lat) && Number.isFinite(destination.lng)
              ? Math.round(haversineMeters(latitude, longitude, destination.lat, destination.lng))
              : null

          const trackingRoom = `tracking:${tNum}`
          io.to(trackingRoom).emit('tracking:update', {
            trackingNumber: tNum,
            lat: latitude,
            lng: longitude,
            latitude,
            longitude,
            at: ping?.at || at,
            distanceMeters,
            status: session?.status ?? 'active',
          })

          io.to(trackingRoom).emit('receive-location', {
            trackingNumber: tNum,
            lat: latitude,
            lng: longitude,
            latitude,
            longitude,
            at: ping?.at || at,
            distanceMeters,
          })

          if (distanceMeters !== null && distanceMeters <= 1000) {
            io.to(trackingRoom).emit('tracking:nearby', {
              trackingNumber: tNum,
              distanceMeters,
              at: ping?.at || at,
            })
          }
        } catch (err) {
          logger.warn({ err: err.message, tNum }, '[Socket] Failed to process send-location for parcel')
        }
      }
    })

    socket.on('retell-call-started', (data) => {
      const callId = data?.callId || data?.call_id || null
      logger.info({ socketId: socket.id, userId, callId, data }, '[Socket] retell call started')
      if (callId) {
        setCallId(userId, callId)
        const state = getPageState(userId)
        if (state) syncRetellState(state)
      }
    })

    socket.on('retell-call-ended', (data) => {
      logger.info({ socketId: socket.id, userId, data }, '[Socket] retell call ended')
      setCallId(userId, null)
    })

    // The client reports which page/filters/product details are open
    socket.on('page:update', (data) => {
      const info = typeof data === 'object' && data !== null ? data : {}
      setPageState(userId, info)
      const state = getPageState(userId)
      if (state && state.callId) {
        syncRetellState(state)
      }
    })

    // The client reports explicit cart actions (add, remove, quantity change)
    socket.on('cart:action', (data) => {
      const actionInfo = typeof data === 'object' && data !== null ? data : {}
      const { action, productName = 'item', color, size, quantity } = actionInfo

      let lastActionPrompt = actionInfo.lastAction || ''
      if (action === 'add_to_cart') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just clicked "ADD TO CART" for "${productName}"${size ? ` in size ${size}` : ''}${color ? ` (${color})` : ''}. You MUST speak out loud IMMEDIATELY! React with enthusiasm, hype, and funny witty shoe-store flair celebrating them adding this fresh pair!`
      } else if (action === 'remove_from_cart') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just clicked "REMOVE FROM CART" for "${productName}". You MUST speak out loud IMMEDIATELY with funny, playful dramatic shock like "Wait, you're ditching those?!"`
      } else if (action === 'increase_quantity') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just increased quantity of "${productName}" in cart to ${quantity}. You MUST speak out loud IMMEDIATELY in a funny, hype sneakerhead persona like "Doubling up?! I see you big spender!"`
      } else if (action === 'decrease_quantity') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just decreased quantity of "${productName}" in cart to ${quantity}. You MUST speak out loud IMMEDIATELY in a witty, lighthearted tone like "Trimming down the order? Keeping it sensible, I respect that!"`
      } else if (action === 'remove_item') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just removed "${productName}" completely from their cart. You MUST speak out loud IMMEDIATELY in a funny, sassy dramatic sneakerhead persona like "RIP to those kicks in the cart, they were nice though!"`
      } else if (!lastActionPrompt) {
        lastActionPrompt = `User updated cart (${action || 'cart interaction'})`
      }

      setPageState(userId, {
        cartSummary: actionInfo.cartSummary,
        lastAction: lastActionPrompt,
      })

      const state = getPageState(userId)
      if (state && state.callId) {
        // Immediate sync bypasses 400ms debounce buffer so agent speaks instantly
        syncRetellState(state, true)
      }
    })

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId, reason }, '[Socket] client disconnected')
    })
  })

  logger.info('[Socket] Socket.io server initialized')
}

export function getIO() {
  return io
}

export function emitToUser(userId, event, payload) {
  if (!io) return
  io.to(`user:${userId}`).emit(event, payload)
}
