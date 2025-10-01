"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
require("reflect-metadata");
const app_1 = __importDefault(require("./app"));
const db_1 = require("./database/db");
const logger_1 = require("./helpers/logger");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socketHandlers_1 = require("./socket/socketHandlers");
const SessionCleanupService_1 = require("./services/SessionCleanupService"); // ✅ NEW
const PORT = process.env.PORT || 3002;
const httpServer = (0, http_1.createServer)(app_1.default);
const uploadsDir = path_1.default.join(__dirname, '../uploads/newsletter');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    logger_1.logger.info('Created uploads/newsletter directory');
}
// ✅ ENHANCED: Allowed origins for CORS
const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.BWENGE_PLUS_URL,
    'https://ongera.rw',
    'https://www.ongera.rw',
    'https://api.ongera.rw',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
].filter(Boolean);
// Start server
(async () => {
    try {
        // Initialize database connection
        const dbConnection = db_1.DbConnection.instance;
        await dbConnection.initializeDb();
        logger_1.logger.info('Database connection established successfully');
        // ==================== ✅ NEW: START SESSION CLEANUP SERVICE ====================
        SessionCleanupService_1.SessionCleanupService.start();
        logger_1.logger.info('Session cleanup service initialized');
        // ✅ ENHANCED: Socket.IO with better CORS configuration
        const io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: function (origin, callback) {
                    // Allow requests with no origin (mobile apps, curl, etc.)
                    if (!origin)
                        return callback(null, true);
                    if (allowedOrigins.indexOf(origin) !== -1) {
                        callback(null, true);
                    }
                    else {
                        logger_1.logger.warn(`Socket.IO CORS: Origin ${origin} not allowed`);
                        callback(null, true); // Still allow to prevent blocking
                    }
                },
                methods: ["GET", "POST"],
                credentials: true,
                allowedHeaders: ['Content-Type', 'Authorization']
            },
            allowEIO3: true,
            transports: ["websocket", "polling"],
            path: "/socket.io/",
        });
        (0, socketHandlers_1.setupSocketHandlers)(io);
        logger_1.logger.info('Socket.IO handlers initialized successfully');
        // Start HTTP server
        const server = httpServer.listen(PORT, () => {
            logger_1.logger.info('='.repeat(60));
            logger_1.logger.info(`🚀 Server Running`);
            logger_1.logger.info('='.repeat(60));
            logger_1.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger_1.logger.info(`Port: ${PORT}`);
            logger_1.logger.info(`API URL: http://localhost:${PORT}`);
            logger_1.logger.info(`Socket.IO URL: http://localhost:${PORT}`);
            logger_1.logger.info(`Socket.IO Path: /socket.io/`);
            logger_1.logger.info(`SSO Enabled: Yes`); // ✅ NEW
            logger_1.logger.info(`BwengePlus URL: ${process.env.BWENGE_PLUS_URL || 'Not configured'}`); // ✅ NEW
            logger_1.logger.info(`Allowed Origins: ${allowedOrigins.join(', ')}`); // ✅ NEW
            logger_1.logger.info('='.repeat(60));
        });
        // Handle server errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger_1.logger.error(`Port ${PORT} is already in use`);
            }
            else {
                logger_1.logger.error('Server error:', error);
            }
            process.exit(1);
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_1.logger.info(`${signal} received, shutting down gracefully`);
            // ✅ Stop session cleanup service
            SessionCleanupService_1.SessionCleanupService.stop();
            logger_1.logger.info('Session cleanup service stopped');
            io.close(() => {
                logger_1.logger.info('Socket.IO closed');
            });
            server.close(() => {
                logger_1.logger.info('HTTP server closed');
                db_1.DbConnection.instance.disconnectDb().then(() => {
                    process.exit(0);
                });
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_1.logger.error('Error starting server:', error);
        process.exit(1);
    }
})();
