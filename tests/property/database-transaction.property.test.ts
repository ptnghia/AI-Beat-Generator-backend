import fc from 'fast-check';
import { getPrismaClient } from '../../src/config/database.config';
import { BeatTemplate } from '../../src/types/beat.types';

describe('Database Transaction Property Tests', () => {
  const prisma = getPrismaClient();

  // Generator for valid beat templates
  const beatTemplateArb = fc.record({
    id: fc.string({ minLength: 5, maxLength: 50 }).map(s => 
      s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    ),
    categoryName: fc.string({ minLength: 5, maxLength: 50 }),
    genre: fc.constantFrom('Lo-fi', 'Trap', 'Cinematic', 'Afrobeats', 'Ambient'),
    style: fc.string({ minLength: 5, maxLength: 30 }),
    mood: fc.constantFrom('Chill', 'Dark', 'Happy', 'Sad', 'Calm'),
    useCase: fc.string({ minLength: 5, maxLength: 30 }),
    tags: fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 1, maxLength: 10 }),
    basePrompt: fc.string({ minLength: 20, maxLength: 200 }),
    isActive: fc.constant(true),
    xmlChecksum: fc.hexaString({ minLength: 32, maxLength: 32 })
  });

  // Generator for API keys
  const apiKeyArb = fc.record({
    id: fc.uuid(),
    key: fc.string({ minLength: 32, maxLength: 64 }),
    status: fc.constantFrom('active', 'exhausted'),
    quotaRemaining: fc.integer({ min: 0, max: 500 })
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.beatTemplate.deleteMany({
      where: {
        id: {
          startsWith: 'test-tx-'
        }
      }
    });
    await prisma.apiKey.deleteMany({
      where: {
        key: {
          startsWith: 'test-tx-'
        }
      }
    });
  });

  afterAll(async () => {
    // Final cleanup
    await prisma.beatTemplate.deleteMany({
      where: {
        id: {
          startsWith: 'test-tx-'
        }
      }
    });
    await prisma.apiKey.deleteMany({
      where: {
        key: {
          startsWith: 'test-tx-'
        }
      }
    });
  });

  /**
   * Feature: automated-beat-generation, Property 24: Transaction Atomicity
   * Validates: Requirements 8.2
   * 
   * For any multi-step database operation, if any step fails, all changes should be 
   * rolled back and the database should remain in its previous consistent state.
   */
  it('Property 24: Transaction Atomicity - should rollback all changes on error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(beatTemplateArb, { minLength: 2, maxLength: 5 }).map(templates =>
          templates.map((t, i) => ({ 
            ...t, 
            id: `test-tx-template-${i}-${Date.now()}`,
            categoryName: `test-tx-category-${i}-${Date.now()}`
          }))
        ),
        fc.array(apiKeyArb, { minLength: 1, maxLength: 3 }).map(keys =>
          keys.map((k, i) => ({ ...k, key: `test-tx-key-${i}-${Date.now()}` }))
        ),
        async (templates, apiKeys) => {
          // Record initial state
          const initialTemplateCount = await prisma.beatTemplate.count({
            where: { id: { in: templates.map(t => t.id) } }
          });
          const initialKeyCount = await prisma.apiKey.count({
            where: { key: { in: apiKeys.map(k => k.key) } }
          });

          expect(initialTemplateCount).toBe(0);
          expect(initialKeyCount).toBe(0);

          // Test 1: Successful transaction - all operations should succeed
          try {
            await prisma.$transaction(async (tx) => {
              // Insert templates
              for (const template of templates) {
                await tx.beatTemplate.create({
                  data: {
                    id: template.id,
                    categoryName: template.categoryName,
                    genre: template.genre,
                    style: template.style,
                    mood: template.mood,
                    useCase: template.useCase,
                    tags: template.tags,
                    basePrompt: template.basePrompt,
                    isActive: template.isActive,
                    xmlChecksum: template.xmlChecksum
                  }
                });
              }

              // Insert API keys
              for (const key of apiKeys) {
                await tx.apiKey.create({
                  data: {
                    key: key.key,
                    status: key.status,
                    quotaRemaining: key.quotaRemaining
                  }
                });
              }
            });

            // Verify all data was inserted
            const templateCount = await prisma.beatTemplate.count({
              where: { id: { in: templates.map(t => t.id) } }
            });
            const keyCount = await prisma.apiKey.count({
              where: { key: { in: apiKeys.map(k => k.key) } }
            });

            expect(templateCount).toBe(templates.length);
            expect(keyCount).toBe(apiKeys.length);
          } catch (error) {
            // Transaction should not fail for valid data
            throw error;
          }

          // Test 2: Failed transaction - should rollback all changes
          const newTemplates = templates.map((t, i) => ({
            ...t,
            id: `test-tx-template-fail-${i}-${Date.now()}`,
            categoryName: `test-tx-fail-category-${i}-${Date.now()}`
          }));

          try {
            await prisma.$transaction(async (tx) => {
              // Insert first template successfully
              await tx.beatTemplate.create({
                data: {
                  id: newTemplates[0].id,
                  categoryName: newTemplates[0].categoryName,
                  genre: newTemplates[0].genre,
                  style: newTemplates[0].style,
                  mood: newTemplates[0].mood,
                  useCase: newTemplates[0].useCase,
                  tags: newTemplates[0].tags,
                  basePrompt: newTemplates[0].basePrompt,
                  isActive: newTemplates[0].isActive,
                  xmlChecksum: newTemplates[0].xmlChecksum
                }
              });

              // Intentionally cause an error by trying to insert duplicate
              await tx.beatTemplate.create({
                data: {
                  id: newTemplates[0].id, // Duplicate ID - will fail
                  categoryName: `test-tx-fail-duplicate-${Date.now()}`, // Unique categoryName
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

            // Should not reach here
            throw new Error('Transaction should have failed');
          } catch (error) {
            // Expected to fail
            expect(error).toBeDefined();
          }

          // Verify rollback - the first template should NOT exist
          const failedTemplateCount = await prisma.beatTemplate.count({
            where: { id: { in: newTemplates.map(t => t.id) } }
          });
          expect(failedTemplateCount).toBe(0);

          // Verify original data is still intact
          const finalTemplateCount = await prisma.beatTemplate.count({
            where: { id: { in: templates.map(t => t.id) } }
          });
          const finalKeyCount = await prisma.apiKey.count({
            where: { key: { in: apiKeys.map(k => k.key) } }
          });

          expect(finalTemplateCount).toBe(templates.length);
          expect(finalKeyCount).toBe(apiKeys.length);

          // Cleanup
          await prisma.beatTemplate.deleteMany({
            where: { id: { in: templates.map(t => t.id) } }
          });
          await prisma.apiKey.deleteMany({
            where: { key: { in: apiKeys.map(k => k.key) } }
          });
        }
      ),
      { numRuns: 10 } // Reduced runs for database tests
    );
  }, 120000); // 2 minutes timeout for database operations

  /**
   * Property 24b: Transaction Atomicity with Multiple Tables
   * Tests that transactions work correctly across multiple related tables
   */
  it('Property 24b: Transaction Atomicity - should rollback changes across multiple tables', async () => {
    await fc.assert(
      fc.asyncProperty(
        beatTemplateArb.map(t => ({ 
          ...t, 
          id: `test-tx-multi-${Date.now()}`,
          categoryName: `test-tx-multi-category-${Date.now()}`
        })),
        apiKeyArb.map(k => ({ ...k, key: `test-tx-multi-key-${Date.now()}` })),
        async (template, apiKey) => {
          // Record initial state
          const initialTemplateExists = await prisma.beatTemplate.findUnique({
            where: { id: template.id }
          });
          const initialKeyExists = await prisma.apiKey.findUnique({
            where: { key: apiKey.key }
          });

          expect(initialTemplateExists).toBeNull();
          expect(initialKeyExists).toBeNull();

          // Attempt transaction that will fail
          try {
            await prisma.$transaction(async (tx) => {
              // Create template
              await tx.beatTemplate.create({
                data: {
                  id: template.id,
                  categoryName: template.categoryName,
                  genre: template.genre,
                  style: template.style,
                  mood: template.mood,
                  useCase: template.useCase,
                  tags: template.tags,
                  basePrompt: template.basePrompt,
                  isActive: template.isActive,
                  xmlChecksum: template.xmlChecksum
                }
              });

              // Create API key
              await tx.apiKey.create({
                data: {
                  key: apiKey.key,
                  status: apiKey.status,
                  quotaRemaining: apiKey.quotaRemaining
                }
              });

              // Force an error by violating a constraint
              throw new Error('Simulated transaction failure');
            });

            // Should not reach here
            throw new Error('Transaction should have failed');
          } catch (error) {
            // Expected to fail
            expect(error).toBeDefined();
          }

          // Verify complete rollback - neither record should exist
          const templateAfterRollback = await prisma.beatTemplate.findUnique({
            where: { id: template.id }
          });
          const keyAfterRollback = await prisma.apiKey.findUnique({
            where: { key: apiKey.key }
          });

          expect(templateAfterRollback).toBeNull();
          expect(keyAfterRollback).toBeNull();
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);

  /**
   * Property 24c: Transaction Atomicity with Updates
   * Tests that failed update transactions don't leave partial changes
   */
  it('Property 24c: Transaction Atomicity - should rollback failed updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        beatTemplateArb.map(t => ({ 
          ...t, 
          id: `test-tx-update-${Date.now()}`,
          categoryName: `test-tx-update-category-${Date.now()}`
        })),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        async (template, newCategoryName, newStyle) => {
          // Create initial template
          await prisma.beatTemplate.create({
            data: {
              id: template.id,
              categoryName: template.categoryName,
              genre: template.genre,
              style: template.style,
              mood: template.mood,
              useCase: template.useCase,
              tags: template.tags,
              basePrompt: template.basePrompt,
              isActive: template.isActive,
              xmlChecksum: template.xmlChecksum
            }
          });

          const originalTemplate = await prisma.beatTemplate.findUnique({
            where: { id: template.id }
          });

          // Attempt transaction with updates that will fail
          try {
            await prisma.$transaction(async (tx) => {
              // Update category name
              await tx.beatTemplate.update({
                where: { id: template.id },
                data: { categoryName: newCategoryName }
              });

              // Update style
              await tx.beatTemplate.update({
                where: { id: template.id },
                data: { style: newStyle }
              });

              // Force an error
              throw new Error('Simulated update failure');
            });

            // Should not reach here
            throw new Error('Transaction should have failed');
          } catch (error) {
            // Expected to fail
            expect(error).toBeDefined();
          }

          // Verify rollback - template should have original values
          const templateAfterRollback = await prisma.beatTemplate.findUnique({
            where: { id: template.id }
          });

          expect(templateAfterRollback).toBeDefined();
          expect(templateAfterRollback?.categoryName).toBe(originalTemplate?.categoryName);
          expect(templateAfterRollback?.style).toBe(originalTemplate?.style);

          // Cleanup
          await prisma.beatTemplate.delete({
            where: { id: template.id }
          });
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);
});
