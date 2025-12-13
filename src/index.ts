import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './config/database.config';
import { validateApiConfig } from './config/api.config';
import { loggingService } from './services/logging.service';
import { CatalogSyncService } from './services/catalog-sync.service';
import { backupSchedulerService } from './services/backup-scheduler.service';
import app from './api/server';
import { Server } from 'http';

// Load environment variables
dotenv.config();

let catalogSyncService: CatalogSyncService;
let server: Server;

async function bootstrap() {
  try {
    loggingService.info('Starting Beat Generator System...');

    // Validate API configuration
    validateApiConfig();
    loggingService.info('API configuration validated');

    // Connect to database
    await connectDatabase();
    loggingService.info('Database connection established');

    // Load beat catalog
    catalogSyncService = new CatalogSyncService();
    await catalogSyncService.loadCatalogOnStartup();
    loggingService.info('Beat catalog loaded');

    // Start backup scheduler (daily at 00:00 UTC)
    backupSchedulerService.start();
    loggingService.info('Backup scheduler started');

    // Start API Server
    const PORT = parseInt(process.env.PORT || '3000', 10);
    server = app.listen(PORT, () => {
      loggingService.info(`API Server listening on port ${PORT}`);
    });

    loggingService.info('Beat Generator System started successfully');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      loggingService.info('Shutting down gracefully...');
      if (server) {
        server.close(() => {
          loggingService.info('API Server closed');
        });
      }
      if (catalogSyncService) {
        await catalogSyncService.stopWatching();
      }
      backupSchedulerService.stop();
      await disconnectDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      loggingService.info('Shutting down gracefully...');
      if (server) {
        server.close(() => {
          loggingService.info('API Server closed');
        });
      }
      if (catalogSyncService) {
        await catalogSyncService.stopWatching();
      }
      backupSchedulerService.stop();
      await disconnectDatabase();
      process.exit(0);
    });

  } catch (error) {
    loggingService.error('Failed to start Beat Generator System', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

bootstrap();
