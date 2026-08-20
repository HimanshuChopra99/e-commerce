import { io } from 'socket.io-client'

const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(partnerPublicId) {
  const s = getSocket()
  if (!s.connected) {
    s.auth = { userId: partnerPublicId }
    s.connect()
  }
  return s
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect()
  }
}
