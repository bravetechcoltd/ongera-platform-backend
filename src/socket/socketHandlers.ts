import type { Server, Socket } from "socket.io";
import { setupCommunityChatHandlers } from "./communityChatHandlers";
import { socketAuthMiddleware } from "../helpers/socketAuth";
import { setSocketIO } from "./socketRegistry";

export const setupSocketHandlers = (io: Server) => {
  // Register globally for cross-module use (notifications, etc.)
  setSocketIO(io);

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  const activeUsers = new Map<number, Set<string>>();

  io.use((socket, next) => {
    const clientAddress = socket.handshake.address;
    next();
  });

  io.on("connection", (socket: Socket) => {
    // Join personal room for direct notifications (follow, new-project alerts, etc.)
    const userId = socket.data.user?.id;
    if (userId) {
      socket.join(`user_${userId}`);
    }

    socket.emit("connection_success", {
      message: "Socket connected successfully",
      socketId: socket.id,
    });

    // Setup community chat handlers for this socket
    setupCommunityChatHandlers(io, socket);

    // Test event for debugging
    socket.on("test_event", (data) => {
      socket.emit("test_response", {
        message: "Test event received successfully",
        receivedData: data,
        timestamp: new Date().toISOString(),
      });
    });
  });
};
