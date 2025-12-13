import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { OrchestratorService } from './orchestrator.service';
import { LoggingService } from './logging.service';

export class SchedulerService {
  private prisma: PrismaClient;
  private orchestrator: OrchestratorService;
  private logger: LoggingService;
  private cronJob: cron.ScheduledTask | null = null;
  private isJobRunning: boolean = false;

  constructor(
    prisma: PrismaClient,
    orchestrator: OrchestratorService,
    logger: LoggingService
  ) {
    this.prisma = prisma;
    this.orchestrator = orchestrator;
    this.logger = logger;
  }

  /**
   * Start the scheduler with 15-minute interval
   */
  start(): void {
    if (this.cronJob) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    // Schedule: every 15 minutes (*/15 * * * *)
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      await this.executeScheduledJob();
    });

    this.logger.info('Scheduler started with 15-minute interval');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.logger.info('Scheduler stopped');
    }
  }

  /**
   * Execute a scheduled beat generation job
   */
  private async executeScheduledJob(): Promise<void> {
    const startTime = Date.now();

    // Concurrent job prevention
    if (this.isJobRunning) {
      this.logger.info('Skipping scheduled job - previous job still running');
      return;
    }

    this.isJobRunning = true;
    let selectedTemplate: any = null;

    try {
      // Select a template that hasn't been used in the last 24 hours
      selectedTemplate = await this.selectTemplate();

      if (!selectedTemplate) {
        this.logger.warn('No available templates - all templates used within 24 hours');
        await this.logExecution(null, 'skipped', 'No available templates', Date.now() - startTime);
        return;
      }

      this.logger.info(`Selected template: ${selectedTemplate.categoryName} (${selectedTemplate.id})`);

      // Generate beat using orchestrator
      const beat = await this.orchestrator.generateBeat(selectedTemplate.id);

      // Update template lastUsed timestamp
      await this.prisma.beatTemplate.update({
        where: { id: selectedTemplate.id },
        data: { lastUsed: new Date() },
      });

      const executionTime = Date.now() - startTime;
      await this.logExecution(selectedTemplate.id, 'success', null, executionTime);

      this.logger.info(
        `Beat generation completed successfully: ${beat.name} (${executionTime}ms)`
      );
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      await this.logExecution(
        selectedTemplate?.id || null,
        'failed',
        errorMessage,
        executionTime
      );

      this.logger.error('Scheduled beat generation failed', {
        templateId: selectedTemplate?.id,
        error: errorMessage,
        stack: error.stack,
      });
    } finally {
      this.isJobRunning = false;
    }
  }

  /**
   * Select a template that hasn't been used in the last 24 hours
   */
  private async selectTemplate(): Promise<any | null> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get templates that haven't been used in 24 hours or never used
    const availableTemplates = await this.prisma.beatTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { lastUsed: null },
          { lastUsed: { lt: twentyFourHoursAgo } },
        ],
      },
    });

    // If no templates available, reset and use all templates
    if (availableTemplates.length === 0) {
      this.logger.info('All templates used within 24 hours - resetting selection pool');

      const allTemplates = await this.prisma.beatTemplate.findMany({
        where: { isActive: true },
      });

      if (allTemplates.length === 0) {
        return null;
      }

      // Select random template from all
      const randomIndex = Math.floor(Math.random() * allTemplates.length);
      return allTemplates[randomIndex];
    }

    // Select random template from available ones
    const randomIndex = Math.floor(Math.random() * availableTemplates.length);
    return availableTemplates[randomIndex];
  }

  /**
   * Log execution details
   */
  private async logExecution(
    templateId: string | null,
    result: 'success' | 'failed' | 'skipped',
    errorMessage: string | null,
    executionTime: number
  ): Promise<void> {
    await this.prisma.executionLog.create({
      data: {
        level: result === 'success' ? 'INFO' : result === 'failed' ? 'ERROR' : 'WARN',
        service: 'SchedulerService',
        message: `Scheduled beat generation ${result}`,
        context: {
          templateId,
          result,
          errorMessage,
          executionTime,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Check if a job is currently running
   */
  isRunning(): boolean {
    return this.isJobRunning;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isSchedulerActive: boolean;
    isJobRunning: boolean;
  } {
    return {
      isSchedulerActive: this.cronJob !== null,
      isJobRunning: this.isJobRunning,
    };
  }

  /**
   * Manually trigger a beat generation (for testing)
   */
  async triggerManual(): Promise<void> {
    await this.executeScheduledJob();
  }
}
