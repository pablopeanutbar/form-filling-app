






import app, { closeApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const startServer = async () => {
  // Attempt to connect to MongoDB Atlas
  await connectDB();

  // Start Express server
  const privateGemini = env.NODE_ENV === 'development' && env.GEMINI_MATCHING_ENABLED && env.GEMINI_PRIVATE_SYNTHETIC_DEV === 'true';
  const server = app.listen(env.PORT, privateGemini ? '127.0.0.1' : undefined, () => {
    console.log(`[Server] formER Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`[Server] Health check: http://localhost:${env.PORT}/api/v1/health`);
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await closeApp();
      await disconnectDB();
      console.log('[Server] Shutdown complete.');
      process.exit(0);
    });

    // Force close after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      console.error('[Server] Forceful shutdown initiated after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
};

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});

