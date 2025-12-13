import * as cron from 'node-cron';
import { createBackupUtil } from '../utils/backup.util';
import { loggingService } from './logging.service';

export class BackupSchedulerService {
  private scheduledTask?: cron.ScheduledTask;
  private backupUtil = createBackupUtil();
  private isRunning = false;

  /**
   * Start the backup scheduler
   * Runs daily at 00:00 UTC
   */
  start(): void {
    if (this.isRunning) {
      loggingService.warn('Backup scheduler is already running', {
        service: 'BackupSchedulerService'
      });
      return;
    }

    try {
      // Schedule daily backup at 00:00 UTC
      // Cron expression: '0 0 * * *' = At 00:00 every day
      this.scheduledTask = cron.schedule(
        '0 0 * * *',
        async () => {
          await this.executeBackup();
        },
        {
          scheduled: true,
          timezone: 'UTC'
        }
      );

      this.isRunning = true;

      loggingService.info('Backup scheduler started', {
        service: 'BackupSchedulerService',
        schedule: 'Daily at 00:00 UTC'
      });
    } catch (error) {
      loggingService.logError('BackupSchedulerService', error as Error, {
        context: 'start'
      });
      throw error;
    }
  }

  /**
   * Stop the backup scheduler
   */
  stop(): void {
    if (!this.isRunning || !this.scheduledTask) {
      loggingService.warn('Backup scheduler is not running', {
        service: 'BackupSchedulerService'
      });
      return;
    }

    try {
      this.scheduledTask.stop();
      this.isRunning = false;

      loggingService.info('Backup scheduler stopped', {
        service: 'BackupSchedulerService'
      });
    } catch (error) {
      loggingService.logError('BackupSchedulerService', error as Error, {
        context: 'stop'
      });
      throw error;
    }
  }

  /**
   * Execute backup manually
   */
  async executeBackup(): Promise<string> {
    const startTime = Date.now();

    try {
      loggingService.info('Starting scheduled database backup', {
        service: 'BackupSchedulerService',
        timestamp: new Date().toISOString()
      });

      const backupPath = await this.backupUtil.createBackup();

      // Clean old backups (keep last 7 days)
      this.backupUtil.cleanOldBackups(7);

      const duration = Date.now() - startTime;
      loggingService.info('Scheduled backup completed successfully', {
        service: 'BackupSchedulerService',
        backupPath,
        duration: `${duration}ms`
      });

      return backupPath;
    } catch (error) {
      const duration = Date.now() - startTime;
      loggingService.logError('BackupSchedulerService', error as Error, {
        context: 'executeBackup',
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      // Note: node-cron doesn't provide next run time directly
      // This would need to be calculated based on the cron expression
    };
  }
}

// Export singleton instance
export const backupSchedulerService = new BackupSchedulerService();
