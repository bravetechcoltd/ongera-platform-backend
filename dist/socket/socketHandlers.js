"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = void 0;
const communityChatHandlers_1 = require("./communityChatHandlers");
const socketAuth_1 = require("../helpers/socketAuth");
const setupSocketHandlers = (io) => {
    // Apply authentication middleware
    io.use(socketAuth_1.socketAuthMiddleware);
    const activeUsers = new Map();
    io.use((socket, next) => {
        const clientAddress = socket.handshake.address;
        next();
    });
    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        socket.emit("connection_success", {
            message: "Socket connected successfully",
            socketId: socket.id,
        });
        // Setup community chat handlers for this socket
        (0, communityChatHandlers_1.setupCommunityChatHandlers)(io, socket);
        // Test event for debugging
        socket.on("test_event", (data) => {
            socket.emit("test_response", {
                message: "Test event received successfully",
                receivedData: data,
                timestamp: new Date().toISOString(),
            });
        });
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
};
exports.setupSocketHandlers = setupSocketHandlers;
