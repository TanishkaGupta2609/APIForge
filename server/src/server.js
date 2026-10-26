import app from './app.js';
import env from './config/env.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[APIForge Server] Listening on http://localhost:${PORT} in ${env.NODE_ENV} mode`);
});

// Graceful shutdown handling
const handleShutdown = (signal) => {
  console.log(`\n[APIForge Server] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[APIForge Server] HTTP server closed.');
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
