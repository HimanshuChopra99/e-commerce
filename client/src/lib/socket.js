import { io } from "socket.io-client"

let socket = null

export function connectSocket(userId) {
    if (socket?.connected) return socket

    // Use window.location.hostname to construct socket server URL if running in local dev or production
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000"

    socket = io(socketUrl, {
        transports: ['websocket'],
        auth: {
            userId: userId || 'guest'
        }
    })

    socket.on('connect', () => {
        console.log("WebSocket Connected successfully! Socket ID:", socket.id);
    })

    socket.on("disconnect", (reason) => {
        console.log("WebSocket Disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
        console.error("WebSocket Connection Error:", error);
    });

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        console.log("Disconnecting WebSocket connection...");
        socket.disconnect();
        socket = null;
    }
}

export function getSocket() {
    return socket;
}