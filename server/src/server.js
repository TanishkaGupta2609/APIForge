import app from './app.js';
import demoApp from './demoApp.js';
import env from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

const PORT = env.PORT || 5000;
const DEMO_PORT = env.DEMO_PORT || 5001;

// Attempt database connection on startup
connectDatabase().catch((err) => {
  console.warn(`[APIForge Server] Starting server in offline/disconnected database mode: ${err.message}`);
});

const server = app.listen(PORT, () => {
  console.log(`[APIForge Server] Listening on http://localhost:${PORT} in ${env.NODE_ENV} mode`);
});

const demoServer = demoApp.listen(DEMO_PORT, () => {
  console.log(`[APIForge Demo] Sandbox API listening on http://localhost:${DEMO_PORT} in ${env.NODE_ENV} mode`);
});

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  console.log(`\n[APIForge Server] Received ${signal}. Closing HTTP servers gracefully...`);

  demoServer.close(() => {
    console.log('[APIForge Demo] Sandbox HTTP server closed.');
  });

  server.close(async () => {
    console.log('[APIForge Server] HTTP server closed.');
    try {
      await disconnectDatabase();
      console.log('[APIForge Server] Database disconnected cleanly.');
    } catch (err) {
      console.error('[APIForge Server] Error during database disconnect:', err.message);
    }
    process.exit(0);
  });


  // Force shutdown after timeout if pending connections hang
  setTimeout(() => {
    console.error('[APIForge Server] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default server;
