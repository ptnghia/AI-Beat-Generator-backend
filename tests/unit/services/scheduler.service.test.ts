import { PrismaClient } from '@prisma/client';
import { SchedulerService } from '../../../src/services/scheduler.service';
import { OrchestratorService } from '../../../src/services/orchestrator.service';
import { LoggingService } from '../../../src/services/logging.service';

const prisma = new PrismaClient();
const loggingService = LoggingService.getInstance();

// Mock orchestrator
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

describe('Scheduler Service Unit Tests', () => {
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

  describe('Scheduler Start and Stop', () => {
    it('should start scheduler successfully', () => {
      scheduler.start();
      const status = scheduler.getStatus();
      expect(status.isSchedulerActive).toBe(true);
      expect(status.isJobRunning).toBe(false);
    });

    it('should stop scheduler successfully', () => {
      scheduler.start();
      scheduler.stop();
      const status = scheduler.getStatus();
      expect(status.isSchedulerActive).toBe(false);
    });

    it('should not start scheduler twice', () => {
      scheduler.start();
      scheduler.start(); // Second start should be ignored
      const status = scheduler.getStatus();
      expect(status.isSchedulerActive).toBe(true);
    });

    it('should handle stop when not started', () => {
      scheduler.stop(); // Should not throw error
      const status = scheduler.getStatus();
      expect(status.isSchedulerActive).toBe(false);
    });
  });

  describe('Behavior When All Templates Recently Used', () => {
    it('should reset and select from all templates when all used within 24 hours', async () => {
      const now = new Date();

      // Create templates all used within last hour
      const templates = [];
      for (let i = 0; i < 3; i++) {
        const template = await prisma.beatTemplate.create({
          data: {
            categoryName: `Recent Template ${i}`,
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

      // Create API key
      const apiKey = await prisma.apiKey.create({
        data: {
          key: 'test-key',
          status: 'active',
          quotaRemaining: 100,
        },
      });

      // Trigger manual execution
      await scheduler.triggerManual();

      // Should still select a template (reset logic)
      expect(mockOrchestrator.generateBeat).toHaveBeenCalled();

      // Clean up
      await prisma.apiKey.delete({ where: { id: apiKey.id } });
      for (const template of templates) {
        await prisma.beatTemplate.delete({ where: { id: template.id } });
      }
    });

    it('should skip execution when no templates exist', async () => {
      // No templates created

      // Create API key
      const apiKey = await prisma.apiKey.create({
        data: {
          key: 'test-key',
          status: 'active',
          quotaRemaining: 100,
        },
      });

      // Trigger manual execution
      await scheduler.triggerManual();

      // Should not call orchestrator
      expect(mockOrchestrator.generateBeat).not.toHaveBeenCalled();

      // Should log skipped execution
      const logs = await prisma.executionLog.findMany({
        where: {
          service: 'SchedulerService',
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[0];
      const context = log.context as any;
      expect(context.result).toBe('skipped');

      // Clean up
      await prisma.apiKey.delete({ where: { id: apiKey.id } });
    });
  });

  describe('Scheduler With No Available API Keys', () => {
    it('should fail when no API keys available', async () => {
      // Create template
      const template = await prisma.beatTemplate.create({
        data: {
          categoryName: 'Test Template',
          genre: 'Test',
          style: 'Test',
          mood: 'Test',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: 'Test prompt',
        },
      });

      // No API keys created

      // Mock orchestrator to throw error about no API keys
      const failingOrch = {
        generateBeat: jest.fn().mockRejectedValue(new Error('No active API keys available')),
      } as any;

      const testScheduler = new SchedulerService(prisma, failingOrch, loggingService);

      // Trigger manual execution
      await testScheduler.triggerManual();

      // Should log failed execution
      const logs = await prisma.executionLog.findMany({
        where: {
          service: 'SchedulerService',
          level: 'ERROR',
        },
      });

      expect(logs.length).toBeGreaterThan(0);
      const log = logs[0];
      const context = log.context as any;
      expect(context.result).toBe('failed');
      expect(context.errorMessage).toContain('No active API keys');

      // Clean up
      await prisma.beatTemplate.delete({ where: { id: template.id } });
    });
  });

  describe('Template Selection Logic', () => {
    it('should prefer templates never used', async () => {
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

      // Create one template never used
      const neverUsedTemplate = await prisma.beatTemplate.create({
        data: {
          categoryName: 'Never Used Template',
          genre: 'Test',
          style: 'Test',
          mood: 'Test',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: 'Test prompt',
          lastUsed: null,
        },
      });

      // Create one template used 25 hours ago
      const oldTemplate = await prisma.beatTemplate.create({
        data: {
          categoryName: 'Old Template',
          genre: 'Test',
          style: 'Test',
          mood: 'Test',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: 'Test prompt',
          lastUsed: twentyFiveHoursAgo,
        },
      });

      // Create API key
      const apiKey = await prisma.apiKey.create({
        data: {
          key: 'test-key',
          status: 'active',
          quotaRemaining: 100,
        },
      });

      // Trigger multiple times to see selection
      for (let i = 0; i < 5; i++) {
        await scheduler.triggerManual();
      }

      // Should have called orchestrator 5 times
      expect(mockOrchestrator.generateBeat).toHaveBeenCalledTimes(5);

      // Both templates should be eligible for selection
      const calls = (mockOrchestrator.generateBeat as jest.Mock).mock.calls;
      const selectedIds = calls.map((call) => call[0]);

      // At least one of the templates should have been selected
      const hasNeverUsed = selectedIds.includes(neverUsedTemplate.id);
      const hasOld = selectedIds.includes(oldTemplate.id);
      expect(hasNeverUsed || hasOld).toBe(true);

      // Clean up
      await prisma.apiKey.delete({ where: { id: apiKey.id } });
      await prisma.beatTemplate.delete({ where: { id: neverUsedTemplate.id } });
      await prisma.beatTemplate.delete({ where: { id: oldTemplate.id } });
    });

    it('should update template lastUsed after successful generation', async () => {
      // Create template
      const template = await prisma.beatTemplate.create({
        data: {
          categoryName: 'Test Template',
          genre: 'Test',
          style: 'Test',
          mood: 'Test',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: 'Test prompt',
          lastUsed: null,
        },
      });

      // Create API key
      const apiKey = await prisma.apiKey.create({
        data: {
          key: 'test-key',
          status: 'active',
          quotaRemaining: 100,
        },
      });

      const beforeTime = new Date();

      // Trigger execution
      await scheduler.triggerManual();

      const afterTime = new Date();

      // Check template was updated
      const updatedTemplate = await prisma.beatTemplate.findUnique({
        where: { id: template.id },
      });

      expect(updatedTemplate!.lastUsed).not.toBeNull();
      expect(updatedTemplate!.lastUsed!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(updatedTemplate!.lastUsed!.getTime()).toBeLessThanOrEqual(afterTime.getTime());

      // Clean up
      await prisma.apiKey.delete({ where: { id: apiKey.id } });
      await prisma.beatTemplate.delete({ where: { id: template.id } });
    });
  });

  describe('Error Handling', () => {
    it('should handle orchestrator errors gracefully', async () => {
      // Create template
      const template = await prisma.beatTemplate.create({
        data: {
          categoryName: 'Test Template',
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
          key: 'test-key',
          status: 'active',
          quotaRemaining: 100,
        },
      });

      // Mock orchestrator to throw error
      const failingOrch = {
        generateBeat: jest.fn().mockRejectedValue(new Error('Orchestrator error')),
      } as any;

      const testScheduler = new SchedulerService(prisma, failingOrch, loggingService);

      // Trigger execution - should not throw
      await testScheduler.triggerManual();

      // Should log error
      const logs = await prisma.executionLog.findMany({
        where: {
          service: 'SchedulerService',
          level: 'ERROR',
        },
      });

      expect(logs.length).toBeGreaterThan(0);

      // Clean up
      await prisma.apiKey.delete({ where: { id: apiKey.id } });
      await prisma.beatTemplate.delete({ where: { id: template.id } });
    });

    it('should allow new jobs after error', async () => {
      // Create template
      const template = await prisma.beatTemplate.create({
        data: {
          categoryName: 'Test Template',
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
          key: 'test-key',
          status: 'active',
          quotaRemaining: 100,
        },
      });

      // First call fails
      const failThenSucceedOrch = {
        generateBeat: jest
          .fn()
          .mockRejectedValueOnce(new Error('First error'))
          .mockResolvedValueOnce({
            id: 'test-beat-id',
            name: 'Test Beat',
          }),
      } as any;

      const testScheduler = new SchedulerService(prisma, failThenSucceedOrch, loggingService);

      // First execution fails
      await testScheduler.triggerManual();

      // Second execution should succeed
      await testScheduler.triggerManual();

      expect(failThenSucceedOrch.generateBeat).toHaveBeenCalledTimes(2);

      // Clean up
      await prisma.apiKey.delete({ where: { id: apiKey.id } });
      await prisma.beatTemplate.delete({ where: { id: template.id } });
    });
  });
});
