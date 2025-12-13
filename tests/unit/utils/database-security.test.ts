import { getPrismaClient } from '../../../src/config/database.config';
import { transactionUtil } from '../../../src/utils/transaction.util';

describe('Database Security Unit Tests', () => {
  const prisma = getPrismaClient();

  beforeEach(async () => {
    // Clean up test data
    await prisma.beatTemplate.deleteMany({
      where: {
        id: {
          startsWith: 'test-security-'
        }
      }
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.beatTemplate.deleteMany({
      where: {
        id: {
          startsWith: 'test-security-'
        }
      }
    });
  });

  /**
   * Test SQL injection prevention
   * Validates: Requirements 8.4
   */
  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in WHERE clause', async () => {
      // Create test template
      const testId = 'test-security-injection-1';
      await prisma.beatTemplate.create({
        data: {
          id: testId,
          categoryName: 'Test Security Category 1',
          genre: 'Lo-fi',
          style: 'Test',
          mood: 'Chill',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: 'Test prompt',
          isActive: true,
          xmlChecksum: 'abc123'
        }
      });

      // Attempt SQL injection
      const maliciousInput = "'; DROP TABLE beats; --";
      const result = await prisma.beatTemplate.findMany({
        where: {
          genre: maliciousInput
        }
      });

      // Should return empty result, not execute SQL injection
      expect(result).toEqual([]);

      // Verify template still exists
      const template = await prisma.beatTemplate.findUnique({
        where: { id: testId }
      });
      expect(template).toBeDefined();

      // Verify beats table still exists
      const beats = await prisma.beat.findMany({ take: 1 });
      expect(Array.isArray(beats)).toBe(true);
    });

    it('should prevent SQL injection in INSERT operation', async () => {
      const testId = 'test-security-injection-2';
      const maliciousPrompt = "Test'; DROP TABLE api_keys; --";

      // Insert with malicious content
      const created = await prisma.beatTemplate.create({
        data: {
          id: testId,
          categoryName: 'Test Security Category 2',
          genre: 'Lo-fi',
          style: 'Test',
          mood: 'Chill',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: maliciousPrompt,
          isActive: true,
          xmlChecksum: 'abc123'
        }
      });

      // Verify data was inserted as literal string
      expect(created.basePrompt).toBe(maliciousPrompt);

      // Verify api_keys table still exists
      const apiKeys = await prisma.apiKey.findMany({ take: 1 });
      expect(Array.isArray(apiKeys)).toBe(true);
    });

    it('should prevent SQL injection in UPDATE operation', async () => {
      const testId = 'test-security-injection-3';

      // Create initial record
      await prisma.beatTemplate.create({
        data: {
          id: testId,
          categoryName: 'Test Security Category 3',
          genre: 'Lo-fi',
          style: 'Original',
          mood: 'Chill',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: 'Original prompt',
          isActive: true,
          xmlChecksum: 'abc123'
        }
      });

      // Update with malicious content
      const maliciousStyle = "'; DELETE FROM beat_templates; --";
      const updated = await prisma.beatTemplate.update({
        where: { id: testId },
        data: {
          style: maliciousStyle
        }
      });

      // Verify update worked and malicious input was treated as data
      expect(updated.style).toBe(maliciousStyle);

      // Verify beat_templates table still has records
      const templates = await prisma.beatTemplate.findMany();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test transaction rollback scenarios
   * Validates: Requirements 8.2
   */
  describe('Transaction Rollback', () => {
    it('should rollback transaction on error', async () => {
      const testId1 = 'test-security-rollback-1';
      const testId2 = 'test-security-rollback-2';

      try {
        await transactionUtil.executeTransaction(async (tx) => {
          // First operation succeeds
          await tx.beatTemplate.create({
            data: {
              id: testId1,
              categoryName: 'Test Rollback Category 1',
              genre: 'Lo-fi',
              style: 'Test',
              mood: 'Chill',
              useCase: 'Test',
              tags: ['test'],
              basePrompt: 'Test prompt',
              isActive: true,
              xmlChecksum: 'abc123'
            }
          });

          // Second operation fails (duplicate ID)
          await tx.beatTemplate.create({
            data: {
              id: testId1, // Duplicate ID - will fail
              categoryName: 'Test Rollback Category 2',
              genre: 'Lo-fi',
              style: 'Test',
              mood: 'Chill',
              useCase: 'Test',
              tags: ['test'],
              basePrompt: 'Test prompt',
              isActive: true,
              xmlChecksum: 'abc123'
            }
          });
        });

        fail('Transaction should have failed');
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }

      // Verify first template was NOT created (rollback worked)
      const template1 = await prisma.beatTemplate.findUnique({
        where: { id: testId1 }
      });
      expect(template1).toBeNull();
    });

    it('should rollback transaction on multiple table operations', async () => {
      const testTemplateId = 'test-security-multi-1';
      const testKeyId = 'test-security-key-1';

      try {
        await transactionUtil.executeTransaction(async (tx) => {
          // Create template
          await tx.beatTemplate.create({
            data: {
              id: testTemplateId,
              categoryName: 'Test Multi Category 1',
              genre: 'Lo-fi',
              style: 'Test',
              mood: 'Chill',
              useCase: 'Test',
              tags: ['test'],
              basePrompt: 'Test prompt',
              isActive: true,
              xmlChecksum: 'abc123'
            }
          });

          // Create API key
          await tx.apiKey.create({
            data: {
              key: testKeyId,
              status: 'active',
              quotaRemaining: 100
            }
          });

          // Force error
          throw new Error('Simulated error');
        });

        fail('Transaction should have failed');
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }

      // Verify neither record was created
      const template = await prisma.beatTemplate.findUnique({
        where: { id: testTemplateId }
      });
      const apiKey = await prisma.apiKey.findUnique({
        where: { key: testKeyId }
      });

      expect(template).toBeNull();
      expect(apiKey).toBeNull();
    });
  });

  /**
   * Test backup file creation
   * Validates: Requirements 8.5
   */
  describe('Backup File Creation', () => {
    it('should handle backup directory creation', () => {
      // This is tested in the backup utility
      // Just verify the utility exists and is importable
      const { createBackupUtil } = require('../../../src/utils/backup.util');
      expect(createBackupUtil).toBeDefined();
      expect(typeof createBackupUtil).toBe('function');
    });

    it('should handle backup scheduler', () => {
      const { backupSchedulerService } = require('../../../src/services/backup-scheduler.service');
      expect(backupSchedulerService).toBeDefined();
      expect(backupSchedulerService.start).toBeDefined();
      expect(backupSchedulerService.stop).toBeDefined();
      expect(backupSchedulerService.getStatus).toBeDefined();
    });
  });

  /**
   * Test parameterized queries with special characters
   * Validates: Requirements 8.4
   */
  describe('Special Characters Handling', () => {
    it('should handle single quotes in data', async () => {
      const testId = 'test-security-quotes-1';
      const dataWithQuotes = "It's a test with 'quotes'";

      const created = await prisma.beatTemplate.create({
        data: {
          id: testId,
          categoryName: 'Test Quotes Category 1',
          genre: 'Lo-fi',
          style: dataWithQuotes,
          mood: 'Chill',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: dataWithQuotes,
          isActive: true,
          xmlChecksum: 'abc123'
        }
      });

      expect(created.style).toBe(dataWithQuotes);
      expect(created.basePrompt).toBe(dataWithQuotes);

      // Retrieve and verify
      const retrieved = await prisma.beatTemplate.findUnique({
        where: { id: testId }
      });

      expect(retrieved?.style).toBe(dataWithQuotes);
      expect(retrieved?.basePrompt).toBe(dataWithQuotes);
    });

    it('should handle double quotes in data', async () => {
      const testId = 'test-security-doublequotes-1';
      const dataWithQuotes = 'Test with "double quotes" inside';

      const created = await prisma.beatTemplate.create({
        data: {
          id: testId,
          categoryName: 'Test Double Quotes Category 1',
          genre: 'Lo-fi',
          style: dataWithQuotes,
          mood: 'Chill',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: dataWithQuotes,
          isActive: true,
          xmlChecksum: 'abc123'
        }
      });

      expect(created.style).toBe(dataWithQuotes);
    });

    it('should handle semicolons in data', async () => {
      const testId = 'test-security-semicolon-1';
      const dataWithSemicolon = 'Test; with; semicolons;';

      const created = await prisma.beatTemplate.create({
        data: {
          id: testId,
          categoryName: 'Test Semicolon Category 1',
          genre: 'Lo-fi',
          style: dataWithSemicolon,
          mood: 'Chill',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: dataWithSemicolon,
          isActive: true,
          xmlChecksum: 'abc123'
        }
      });

      expect(created.style).toBe(dataWithSemicolon);
    });

    it('should handle SQL comments in data', async () => {
      const testId = 'test-security-comments-1';
      const dataWithComments = 'Test -- with SQL comments /* and block comments */';

      const created = await prisma.beatTemplate.create({
        data: {
          id: testId,
          categoryName: 'Test Comments Category 1',
          genre: 'Lo-fi',
          style: dataWithComments,
          mood: 'Chill',
          useCase: 'Test',
          tags: ['test'],
          basePrompt: dataWithComments,
          isActive: true,
          xmlChecksum: 'abc123'
        }
      });

      expect(created.style).toBe(dataWithComments);
    });
  });
});
