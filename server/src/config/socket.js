import { Server } from 'socket.io'

let io;

export function initSocket(httpServer) {
    const corsOrigin = process.env.FRONTEND_URL
        ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
        : ['http://localhost:5173', 'http://127.0.0.1:5173'];

    io = new Server(httpServer, {
        transports: ['websocket'],
        cors: {
            origin: corsOrigin,
            credentials: true,
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.handshake.auth?.userId || 'guest';
        console.log(`[Socket Server] Client Connected: ${socket.id} (User: ${userId})`);

        socket.on("retell-call-started", (data) => {
            console.log(`[Socket Server] Retell call started for socket: ${socket.id}`, data);
        });

        socket.on("retell-call-ended", (data) => {
            console.log(`[Socket Server] Retell call ended for socket: ${socket.id}`, data);
        });

        socket.on("disconnect", (reason) => {
            console.log(`[Socket Server] Client Disconnected: ${socket.id} (Reason: ${reason})`);
        });
    });
}

export function getIO() {
  return io;
}