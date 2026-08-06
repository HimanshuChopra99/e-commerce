import { Server } from 'socket.io'
import { logger } from '../config/logger.js'

let io

export function initSocket(httpServer) {
  const corsOrigin = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
    : ['http://localhost:5173', 'http://127.0.0.1:5173']

  io = new Server(httpServer, {
    transports: ['websocket'],
    cors: { origin: corsOrigin, credentials: true },
  })

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId || 'guest'
    const room   = `user:${userId}`

    socket.join(room)
    logger.info({ socketId: socket.id, userId, room }, '[Socket] client connected')

    socket.on('retell-call-started', (data) => {
      logger.info({ socketId: socket.id, userId, data }, '[Socket] retell call started')
    })

    socket.on('retell-call-ended', (data) => {
      logger.info({ socketId: socket.id, userId, data }, '[Socket] retell call ended')
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