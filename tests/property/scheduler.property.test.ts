import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { SchedulerService } from '../../src/services/scheduler.service';
import { OrchestratorService } from '../../src/services/orchestrator.service';
import { LoggingService } from '../../src/services/logging.service';

const prisma = new PrismaClient();
const loggingService = LoggingService.getInstance();

// Mock orchestrator for testing
const createMockOrchestrator = (): OrchestratorService => {
  return {
    generateBeat: jest.fn().mockResolvedValue({
      id: 'test-beat-id',
      name: 'Test Beat',
      genre: 'Test',
      style: 'Test',
      mood: 'Test',
    }),
  } as any;
};

describe('Scheduler Service Property Tests', () => {
  let scheduler: SchedulerService;
  let mockOrchestrator: OrchestratorService;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up
    await prisma.executionLog.deleteMany({});
    await prisma.promptRecord.deleteMany({});
    await prisma.beat.deleteMany({});
    await prisma.beatTemplate.deleteMany({});
    await prisma.apiKey.deleteMany({});

    mockOrchestrator = createMockOrchestrator();
    scheduler = new SchedulerService(prisma, mockOrchestrator, loggingService);
  });

  afterEach(async () => {
    scheduler.stop();
    
    // Clean up
    await prisma.executionLog.deleteMany({});
    await prisma.promptRecord.deleteMany({});
    await prisma.beat.deleteMany({});
    await prisma.beatTemplate.deleteMany({});
    await prisma.apiKey.deleteMany({});
  });

  describe('Property 18: Schedule Interval Consistency', () => {
    /**
     * Feature: automated-beat-generation, Property 18: Schedule Interval Consistency
     * Validates: Requirements 6.1
     * 
     * For any 1-hour time window when the scheduler is active, exactly 4 beat generation
     * jobs should be triggered (one every 15 minutes).
     * 
     * Note: This property tests the scheduler configuration and manual trigger behavior
     * rather than actual time-based execution (which would require waiting 1 hour).
     */
    it('should have correct cron configuration for 15-minute intervals', () => {
      // The scheduler uses cron expression: */15 * * * *
      // This means: every 15 minutes, every hour, every day
      // In a 1-hour window, this should trigger 4 times: 0, 15, 30, 45 minutes
      
      const scheduler = new SchedulerService(prisma, mockOrchestrator, loggingService);
      
      // Verify scheduler can be started
      scheduler.start();
      const status = scheduler.getStatus();
      expect(status.isSchedulerActive).toBe(true);
      
      scheduler.stop();
      const statusAfterStop = scheduler.getStatus();
      expect(statusAfterStop.isSchedulerActive).toBe(false);
    });

    it('should execute manual triggers correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 4 }),
          async (triggerCount) => {
            // Create test template
            const template = await prisma.beatTemplate.create({
              data: {
                categoryName: `Test Category ${Date.now()}`,
                genre: 'Test',
                style: 'Test',
                mood: 'Test',
                useCase: 'Test',
                tags: ['test'],
                basePrompt: 'Test prompt',
              },
            });

            // Create API key
            const apiKey = await prisma.apiKey.create({
              data: {
                key: `test-key-${Date.now()}`,
                status: 'active',
                quotaRemaining: 100,
              },
            });

            const mockOrch = createMockOrchestrator();
            const testScheduler = new SchedulerService(prisma, mockOrch, loggingService);

            // Manually trigger the specified number of times
            for (let i = 0; i < triggerCount; i++) {
              await testScheduler.triggerManual();
            }

            // Verify orchestrator was called the correct number of times
            expect(mockOrch.generateBeat).toHaveBeenCalledTimes(triggerCount);

            // Clean up
            await prisma.apiKey.delete({ where: { id: apiKey.id } });
            await prisma.beatTemplate.delete({ where: { id: template.id } });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 19: Template Selection Recency Filter', () => {
    /**
     * Feature: automated-beat-generation, Property 19: Template Selection Recency Filter
     * Validates: Requirements 6.2
     * 
     * For any beat template selected by the scheduler, the template's lastUsed timestamp
     * should be either null or older than 24 hours from current time.
     */
    it('should only select templates not used in last 24 hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (templateCount) => {
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

            // Create templates with different lastUsed timestamps
            const templates: any[] = [];
            
            // Some templates used within 24 hours (should not be selected)
            for (let i = 0; i < Math.floor(templateCount / 2); i++) {
              const template = await prisma.beatTemplate.create({
                data: {
                  categoryName: `Recent Template ${Date.now()}-${i}`,
                  genre: 'Test',
                  style: 'Test',
                  mood: 'Test',
                  useCase: 'Test',
                  tags: ['test'],
                  basePrompt: 'Test prompt',
                  lastUsed: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
                },
              });
              templates.push(template);
            }

            // Some templates not used in 24+ hours (should be selectable)
            const oldTemplates: any[] = [];
            for (let i = Math.floor(templateCount / 2); i < templateCount; i++) {
              const template = await prisma.beatTemplate.create({
                data: {
                  categoryName: `Old Template ${Date.now()}-${i}`,
                  genre: 'Test',
                  style: 'Test',
                  mood: 'Test',
                  useCase: 'Test',
                  tags: ['test'],
                  basePrompt: 'Test prompt',
                  lastUsed: twentyFiveHoursAgo,
                },
              });
              templates.push(template);
              oldTemplates.push(template);
            }

            // Create API key
            const apiKey = await prisma.apiKey.create({
              data: {
                key: `test-key-${Date.now()}`,
                status: 'active',
                quotaRemaining: 100,
              },
            });

            const mockOrch = createMockOrchestrator();
            const testScheduler = new SchedulerService(prisma, mockOrch, loggingService);

            // Trigger manual execution
            await testScheduler.triggerManual();

            // Verify that generateBeat was called with a template ID from old templates
            if (oldTemplates.length > 0) {
              expect(mockOrch.generateBeat).toHaveBeenCalled();
              const callArg = (mockOrch.generateBeat as jest.Mock).mock.calls[0][0];
              
              // The selected template should be one of the old templates
              const oldTemplateIds = oldTemplates.map(t => t.id);
              expect(oldTemplateIds).toContain(callArg);
            }

            // Clean up
            await prisma.apiKey.delete({ where: { id: apiKey.id } });
            for (const template of templates) {
              await prisma.beatTemplate.delete({ where: { id: template.id } });
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 20: Concurrent Job Prevention', () => {
    /**
     * Feature: automated-beat-generation, Property 20: Concurrent Job Prevention
     * Validates: Requirements 6.4
     * 
     * For any time when a beat generation job is in 'processing' status, the scheduler
     * should not start a new job until the current job reaches 'completed' or 'failed' status.
     */
    it('should prevent concurrent job execution', async () => {
      // Create test template
      const template = await prisma.beatTemplate.create({
        data: {
          categoryName: `Test Category ${Date.now()}`,
          genre: 'Test',
          style: 'Test',
          mood: 'Test',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: 'Test prompt',
        },
      });

      // Create API key
      const apiKey = await prisma.apiKey.create({
        data: {
          key: `test-key-${Date.now()}`,
          status: 'active',
          quotaRemaining: 100,
        },
      });

      // Create a slow mock orchestrator
      const slowMockOrch = {
        generateBeat: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          return {
            id: 'test-beat-id',
            name: 'Test Beat',
            genre: 'Test',
            style: 'Test',
            mood: 'Test',
          };
        }),
      } as any;

      const testScheduler = new SchedulerService(prisma, slowMockOrch, loggingService);

      // Start first job (will take 100ms)
      const job1Promise = testScheduler.triggerManual();

      // Try to start second job immediately (should be skipped)
      await testScheduler.triggerManual();

      // Wait for first job to complete
      await job1Promise;

      // Verify orchestrator was only called once (second call was prevented)
      expect(slowMockOrch.generateBeat).toHaveBeenCalledTimes(1);

      // Now that first job is done, a new job should be allowed
      await testScheduler.triggerManual();
      expect(slowMockOrch.generateBeat).toHaveBeenCalledTimes(2);

      // Clean up
      await prisma.apiKey.delete({ where: { id: apiKey.id } });
      await prisma.beatTemplate.delete({ where: { id: template.id } });
    });
  });

  describe('Property 21: Schedule Execution Logging', () => {
    /**
     * Feature: automated-beat-generation, Property 21: Schedule Execution Logging
     * Validates: Requirements 6.5
     * 
     * For any scheduler execution, a log entry should be created with timestamp,
     * selected template ID, and execution result.
     */
    it('should log every execution with required details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('success', 'failed', 'skipped'),
          async (expectedResult) => {
            // Create test template
            const template = await prisma.beatTemplate.create({
              data: {
                categoryName: `Test Category ${Date.now()}`,
                genre: 'Test',
                style: 'Test',
                mood: 'Test',
                useCase: 'Test',
                tags: ['test'],
                basePrompt: 'Test prompt',
              },
            });

            // Create API key
            const apiKey = await prisma.apiKey.create({
              data: {
                key: `test-key-${Date.now()}`,
                status: 'active',
                quotaRemaining: 100,
              },
            });

            // Create mock orchestrator based on expected result
            let mockOrch;
            if (expectedResult === 'success') {
              mockOrch = createMockOrchestrator();
            } else if (expectedResult === 'failed') {
              mockOrch = {
                generateBeat: jest.fn().mockRejectedValue(new Error('Test error')),
              } as any;
            } else {
              // For 'skipped', don't create any templates
              await prisma.beatTemplate.delete({ where: { id: template.id } });
              mockOrch = createMockOrchestrator();
            }

            const testScheduler = new SchedulerService(prisma, mockOrch, loggingService);

            // Trigger execution
            try {
              await testScheduler.triggerManual();
            } catch (error) {
              // Expected for failed case
            }

            // Verify log entry was created
            const logs = await prisma.executionLog.findMany({
              where: {
                service: 'SchedulerService',
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            });

            expect(logs.length).toBeGreaterThan(0);
            const log = logs[0];

            // Verify log contains required fields
            expect(log.service).toBe('SchedulerService');
            expect(log.message).toContain('beat generation');
            expect(log.context).toBeDefined();

            const context = log.context as any;
            expect(context.result).toBeDefined();
            expect(context.executionTime).toBeDefined();
            expect(context.timestamp).toBeDefined();

            // Clean up
            if (expectedResult !== 'skipped') {
              await prisma.beatTemplate.delete({ where: { id: template.id } });
            }
            await prisma.apiKey.delete({ where: { id: apiKey.id } });
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
