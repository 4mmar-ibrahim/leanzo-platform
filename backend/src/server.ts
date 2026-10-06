

import { app } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { ensureDefaultAdminUsers } from './controllers/adminAuthController.js';
import { startSubscriptionScheduler, stopSubscriptionScheduler } from './services/subscriptionSchedulerService.js';

async function startServer() {
  try {
    // 1. Connect to Database
    await connectDB();
    await ensureDefaultAdminUsers();

    // 2. Start Subscription Notification & Auto-Renewal Scheduler
    startSubscriptionScheduler(5 * 60 * 1000);

    // 3. Start HTTP Server
    const server = app.listen(ENV.PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Cleanzo Backend Server running on port ${ENV.PORT}`);
      console.log(`📡 Environment: ${ENV.NODE_ENV}`);
      console.log(`🔗 API Base: http://localhost:${ENV.PORT}${ENV.API_PREFIX}`);
      console.log(`🩺 Health check: http://localhost:${ENV.PORT}/api/health`);
      console.log('====================================================');
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      stopSubscriptionScheduler();
      server.close(async () => {
        await disconnectDB();
        console.log('[Server] Cleanup complete. Process exiting.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Critical startup error:', err);
    process.exit(1);
  }
}

startServer();
