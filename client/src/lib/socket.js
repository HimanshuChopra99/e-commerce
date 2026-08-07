import { io } from "socket.io-client"

let socket = null

export function connectSocket(userId) {
    if (socket?.connected) {
        // Reuse only when it is the same user; otherwise reconnect so the
        // server stores page:update under the correct user id.
        if (socket.auth?.userId === userId) return socket
        socket.disconnect()
        socket = null
    }

    // Same-origin by default so the socket works behind the dev-server proxy
    // and in any deployment where the API shares the site's origin. Override
    // with VITE_SOCKET_URL when the socket server lives elsewhere.
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin

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