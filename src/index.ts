import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase, getPrismaClient } from './config/database.config';
import { validateApiConfig } from './config/api.config';
import { loggingService } from './services/logging.service';
import { CatalogSyncService } from './services/catalog-sync.service';
import { backupSchedulerService } from './services/backup-scheduler.service';
import { SchedulerService } from './services/scheduler.service';
import { OrchestratorService } from './services/orchestrator.service';
import app from './api/server';
import { Server } from 'http';

// Load environment variables
dotenv.config();

let catalogSyncService: CatalogSyncService;
let beatScheduler: SchedulerService | null = null;
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

    // Conditionally start beat generation scheduler
    const enableAutoGeneration = process.env.ENABLE_AUTO_GENERATION === 'true';
    if (enableAutoGeneration) {
      beatScheduler = new SchedulerService(
        getPrismaClient(),
        new OrchestratorService(),
        loggingService
      );
      beatScheduler.start();
      loggingService.info('Beat generation scheduler started (auto mode enabled)');
    } else {
      loggingService.info('Beat generation scheduler disabled (ENABLE_AUTO_GENERATION=false)');
    }

    // Note: API Server is started separately via src/api/index.ts
    // This main entry point is for scheduler only
    loggingService.info('Beat Generator System started successfully');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      loggingService.info('Shutting down gracefully...');
      if (catalogSyncService) {
        await catalogSyncService.stopWatching();
      }
      if (beatScheduler) {
        beatScheduler.stop();
      }
      backupSchedulerService.stop();
      await disconnectDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      loggingService.info('Shutting down gracefully...');
      if (catalogSyncService) {
        await catalogSyncService.stopWatching();
      }
      if (beatScheduler) {
        beatScheduler.stop();
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
