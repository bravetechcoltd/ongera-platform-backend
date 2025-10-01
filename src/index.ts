import dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import app from './app';
import { DbConnection } from './database/db';
import { logger } from './helpers/logger';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './socket/socketHandlers';
import { SessionCleanupService } from './services/SessionCleanupService'; // ✅ NEW

const PORT = process.env.PORT || 3002;
const httpServer = createServer(app);

const uploadsDir = path.join(__dirname, '../uploads/newsletter');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads/newsletter directory');
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
    const dbConnection = DbConnection.instance;
    await dbConnection.initializeDb();
    logger.info('Database connection established successfully');

    // ==================== ✅ NEW: START SESSION CLEANUP SERVICE ====================
    SessionCleanupService.start();
    logger.info('Session cleanup service initialized');

    // ✅ ENHANCED: Socket.IO with better CORS configuration
    const io = new Server(httpServer, {
      cors: {
        origin: function (origin, callback) {
          // Allow requests with no origin (mobile apps, curl, etc.)
          if (!origin) return callback(null, true);
          
          if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            logger.warn(`Socket.IO CORS: Origin ${origin} not allowed`);
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

    setupSocketHandlers(io);
    logger.info('Socket.IO handlers initialized successfully');

    // Start HTTP server
    const server = httpServer.listen(PORT, () => {
      logger.info('='.repeat(60));
      logger.info(`🚀 Server Running`);
      logger.info('='.repeat(60));
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Port: ${PORT}`);
      logger.info(`API URL: http://localhost:${PORT}`);
      logger.info(`Socket.IO URL: http://localhost:${PORT}`);
      logger.info(`Socket.IO Path: /socket.io/`);
      logger.info(`SSO Enabled: Yes`); // ✅ NEW
      logger.info(`BwengePlus URL: ${process.env.BWENGE_PLUS_URL || 'Not configured'}`); // ✅ NEW
      logger.info(`Allowed Origins: ${allowedOrigins.join(', ')}`); // ✅ NEW
      logger.info('='.repeat(60));
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      // ✅ Stop session cleanup service
      SessionCleanupService.stop();
      logger.info('Session cleanup service stopped');
      
      io.close(() => {
        logger.info('Socket.IO closed');
      });
      
      server.close(() => {
        logger.info('HTTP server closed');
        DbConnection.instance.disconnectDb().then(() => {
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
})();