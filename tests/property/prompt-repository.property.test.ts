import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { PromptRepository, CreatePromptData } from '../../src/repositories/prompt.repository';

const prisma = new PrismaClient();
const promptRepository = new PromptRepository(prisma);

// Test data generators
const conceptDataArb = fc.record({
  suggestion: fc.string({ minLength: 10, maxLength: 100 }),
  trendAnalysis: fc.string({ minLength: 10, maxLength: 100 }),
  moodEnhancement: fc.string({ minLength: 10, maxLength: 100 }),
});

const tagsArb = fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 1, maxLength: 10 });

const executionResultArb = fc.constantFrom('success' as const, 'failure' as const);

const createPromptDataArb = fc.record({
  templateId: fc.uuid(),
  basePrompt: fc.string({ minLength: 20, maxLength: 200 }),
  normalizedPrompt: fc.string({ minLength: 20, maxLength: 200 }),
  conceptData: conceptDataArb,
  tags: tagsArb,
  apiKeyUsed: fc.uuid(),
  executionResult: executionResultArb,
  errorMessage: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
});

describe('Prompt Repository Property Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await prisma.promptRecord.deleteMany({});
    await prisma.beat.deleteMany({});
    await prisma.beatTemplate.deleteMany({});
    await prisma.apiKey.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test - delete in correct order
    await prisma.promptRecord.deleteMany({});
    await prisma.beat.deleteMany({});
    await prisma.beatTemplate.deleteMany({});
    await prisma.apiKey.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test - delete in correct order
    await prisma.promptRecord.deleteMany({});
    await prisma.beat.deleteMany({});
    await prisma.beatTemplate.deleteMany({});
    await prisma.apiKey.deleteMany({});
  });

  describe('Property 22: Prompt Storage Completeness', () => {
    /**
     * Feature: automated-beat-generation, Property 22: Prompt Storage Completeness
     * Validates: Requirements 7.1, 7.2, 7.3, 7.5
     * 
     * For any prompt record in the database, all required fields should be non-null:
     * version, basePrompt, normalizedPrompt, conceptData, apiKeyUsed, executionResult
     */
    it('should store all required fields when creating a prompt', async () => {
      await fc.assert(
        fc.asyncProperty(createPromptDataArb, async (promptData) => {
          // Create a template first (required for foreign key)
          const template = await prisma.beatTemplate.create({
            data: {
              id: promptData.templateId,
              categoryName: `Test Category ${promptData.templateId}`,
              genre: 'Test Genre',
              style: 'Test Style',
              mood: 'Test Mood',
              useCase: 'Test Use Case',
              tags: ['test'],
              basePrompt: 'Test base prompt',
            },
          });

          // Create an API key (required for foreign key)
          const apiKey = await prisma.apiKey.create({
            data: {
              id: promptData.apiKeyUsed,
              key: `test-key-${promptData.apiKeyUsed}`,
              status: 'active',
              quotaRemaining: 100,
            },
          });

          // Create the prompt
          const createdPrompt = await promptRepository.create(promptData);

          // Verify all required fields are non-null
          expect(createdPrompt.id).toBeDefined();
          expect(createdPrompt.templateId).toBe(promptData.templateId);
          expect(createdPrompt.version).toBeGreaterThan(0);
          expect(createdPrompt.basePrompt).toBe(promptData.basePrompt);
          expect(createdPrompt.normalizedPrompt).toBe(promptData.normalizedPrompt);
          expect(createdPrompt.conceptData).toEqual(promptData.conceptData);
          expect(createdPrompt.tags).toEqual(promptData.tags);
          expect(createdPrompt.apiKeyUsed).toBe(promptData.apiKeyUsed);
          expect(createdPrompt.executionResult).toBe(promptData.executionResult);
          expect(createdPrompt.createdAt).toBeInstanceOf(Date);

          // Verify the prompt can be retrieved with all fields intact
          const retrievedPrompt = await promptRepository.findById(createdPrompt.id);
          expect(retrievedPrompt).not.toBeNull();
          expect(retrievedPrompt!.version).toBe(createdPrompt.version);
          expect(retrievedPrompt!.basePrompt).toBe(promptData.basePrompt);
          expect(retrievedPrompt!.normalizedPrompt).toBe(promptData.normalizedPrompt);
          expect(retrievedPrompt!.conceptData).toEqual(promptData.conceptData);
          expect(retrievedPrompt!.tags).toEqual(promptData.tags);
          expect(retrievedPrompt!.apiKeyUsed).toBe(promptData.apiKeyUsed);
          expect(retrievedPrompt!.executionResult).toBe(promptData.executionResult);

          // Clean up
          await prisma.promptRecord.delete({ where: { id: createdPrompt.id } });
          await prisma.apiKey.delete({ where: { id: apiKey.id } });
          await prisma.beatTemplate.delete({ where: { id: template.id } });
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain version numbers correctly across multiple prompts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(createPromptDataArb, { minLength: 2, maxLength: 5 }),
          async (templateId, promptDataArray) => {
            // Create a template
            const template = await prisma.beatTemplate.create({
              data: {
                id: templateId,
                categoryName: `Test Category ${templateId}`,
                genre: 'Test Genre',
                style: 'Test Style',
                mood: 'Test Mood',
                useCase: 'Test Use Case',
                tags: ['test'],
                basePrompt: 'Test base prompt',
              },
            });

            // Create API keys for each prompt
            const apiKeys = await Promise.all(
              promptDataArray.map((data) =>
                prisma.apiKey.create({
                  data: {
                    id: data.apiKeyUsed,
                    key: `test-key-${data.apiKeyUsed}`,
                    status: 'active',
                    quotaRemaining: 100,
                  },
                })
              )
            );

            // Create prompts with the same templateId
            const createdPrompts: any[] = [];
            for (const promptData of promptDataArray) {
              const prompt = await promptRepository.create({
                ...promptData,
                templateId,
              });
              createdPrompts.push(prompt);
            }

            // Verify versions are sequential
            for (let i = 0; i < createdPrompts.length; i++) {
              expect(createdPrompts[i].version).toBe(i + 1);
            }

            // Clean up
            await prisma.promptRecord.deleteMany({ where: { templateId } });
            await Promise.all(apiKeys.map((key) => prisma.apiKey.delete({ where: { id: key.id } })));
            await prisma.beatTemplate.delete({ where: { id: template.id } });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 23: Prompt Query by Multiple Criteria', () => {
    /**
     * Feature: automated-beat-generation, Property 23: Prompt Query by Multiple Criteria
     * Validates: Requirements 7.4
     * 
     * For any prompt stored in the database, it should be retrievable by querying any of:
     * templateId, genre, style, mood, or tags
     */
    it('should retrieve prompts by templateId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(createPromptDataArb, { minLength: 2, maxLength: 5 }),
          async (templateId, promptDataArray) => {
            // Create a template
            const template = await prisma.beatTemplate.create({
              data: {
                id: templateId,
                categoryName: `Test Category ${templateId}`,
                genre: 'Test Genre',
                style: 'Test Style',
                mood: 'Test Mood',
                useCase: 'Test Use Case',
                tags: ['test'],
                basePrompt: 'Test base prompt',
              },
            });

            // Create API keys and prompts
            const apiKeys = await Promise.all(
              promptDataArray.map((data) =>
                prisma.apiKey.create({
                  data: {
                    id: data.apiKeyUsed,
                    key: `test-key-${data.apiKeyUsed}`,
                    status: 'active',
                    quotaRemaining: 100,
                  },
                })
              )
            );

            const createdPrompts = await Promise.all(
              promptDataArray.map((data) =>
                promptRepository.create({
                  ...data,
                  templateId,
                })
              )
            );

            // Query by templateId
            const results = await promptRepository.query({ templateId });

            // All results should have the same templateId
            expect(results.length).toBe(createdPrompts.length);
            results.forEach((result) => {
              expect(result.templateId).toBe(templateId);
            });

            // Clean up
            await prisma.promptRecord.deleteMany({ where: { templateId } });
            await Promise.all(apiKeys.map((key) => prisma.apiKey.delete({ where: { id: key.id } })));
            await prisma.beatTemplate.delete({ where: { id: template.id } });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should retrieve prompts by genre', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Lo-fi', 'Trap', 'Cinematic', 'Afrobeats'),
          fc.array(createPromptDataArb, { minLength: 2, maxLength: 4 }),
          async (genre, promptDataArray) => {
            // Create templates with the specified genre
            const templates = await Promise.all(
              promptDataArray.map((data, index) =>
                prisma.beatTemplate.create({
                  data: {
                    id: data.templateId,
                    categoryName: `Test Category ${data.templateId}`,
                    genre,
                    style: 'Test Style',
                    mood: 'Test Mood',
                    useCase: 'Test Use Case',
                    tags: ['test'],
                    basePrompt: 'Test base prompt',
                  },
                })
              )
            );

            // Create API keys and prompts
            const apiKeys = await Promise.all(
              promptDataArray.map((data) =>
                prisma.apiKey.create({
                  data: {
                    id: data.apiKeyUsed,
                    key: `test-key-${data.apiKeyUsed}`,
                    status: 'active',
                    quotaRemaining: 100,
                  },
                })
              )
            );

            const createdPrompts = await Promise.all(
              promptDataArray.map((data) => promptRepository.create(data))
            );

            // Query by genre
            const results = await promptRepository.query({ genre });

            // All results should have the same genre
            expect(results.length).toBeGreaterThanOrEqual(createdPrompts.length);
            results.forEach((result) => {
              expect(result.template.genre).toBe(genre);
            });

            // Clean up
            await Promise.all(
              createdPrompts.map((prompt) =>
                prisma.promptRecord.delete({ where: { id: prompt.id } })
              )
            );
            await Promise.all(apiKeys.map((key) => prisma.apiKey.delete({ where: { id: key.id } })));
            await Promise.all(
              templates.map((template) => prisma.beatTemplate.delete({ where: { id: template.id } }))
            );
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should retrieve prompts by style', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.array(createPromptDataArb, { minLength: 2, maxLength: 4 }),
          async (style, promptDataArray) => {
            // Create templates with the specified style
            const templates = await Promise.all(
              promptDataArray.map((data) =>
                prisma.beatTemplate.create({
                  data: {
                    id: data.templateId,
                    categoryName: `Test Category ${data.templateId}`,
                    genre: 'Test Genre',
                    style,
                    mood: 'Test Mood',
                    useCase: 'Test Use Case',
                    tags: ['test'],
                    basePrompt: 'Test base prompt',
                  },
                })
              )
            );

            // Create API keys and prompts
            const apiKeys = await Promise.all(
              promptDataArray.map((data) =>
                prisma.apiKey.create({
                  data: {
                    id: data.apiKeyUsed,
                    key: `test-key-${data.apiKeyUsed}`,
                    status: 'active',
                    quotaRemaining: 100,
                  },
                })
              )
            );

            const createdPrompts = await Promise.all(
              promptDataArray.map((data) => promptRepository.create(data))
            );

            // Query by style
            const results = await promptRepository.query({ style });

            // All results should have the same style
            expect(results.length).toBeGreaterThanOrEqual(createdPrompts.length);
            results.forEach((result) => {
              expect(result.template.style).toBe(style);
            });

            // Clean up
            await Promise.all(
              createdPrompts.map((prompt) =>
                prisma.promptRecord.delete({ where: { id: prompt.id } })
              )
            );
            await Promise.all(apiKeys.map((key) => prisma.apiKey.delete({ where: { id: key.id } })));
            await Promise.all(
              templates.map((template) => prisma.beatTemplate.delete({ where: { id: template.id } }))
            );
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should retrieve prompts by mood', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Chill', 'Dark', 'Happy', 'Sad'),
          fc.array(createPromptDataArb, { minLength: 2, maxLength: 4 }),
          async (mood, promptDataArray) => {
            // Create templates with the specified mood
            const templates = await Promise.all(
              promptDataArray.map((data) =>
                prisma.beatTemplate.create({
                  data: {
                    id: data.templateId,
                    categoryName: `Test Category ${data.templateId}`,
                    genre: 'Test Genre',
                    style: 'Test Style',
                    mood,
                    useCase: 'Test Use Case',
                    tags: ['test'],
                    basePrompt: 'Test base prompt',
                  },
                })
              )
            );

            // Create API keys and prompts
            const apiKeys = await Promise.all(
              promptDataArray.map((data) =>
                prisma.apiKey.create({
                  data: {
                    id: data.apiKeyUsed,
                    key: `test-key-${data.apiKeyUsed}`,
                    status: 'active',
                    quotaRemaining: 100,
                  },
                })
              )
            );

            const createdPrompts = await Promise.all(
              promptDataArray.map((data) => promptRepository.create(data))
            );

            // Query by mood
            const results = await promptRepository.query({ mood });

            // All results should have the same mood
            expect(results.length).toBeGreaterThanOrEqual(createdPrompts.length);
            results.forEach((result) => {
              expect(result.template.mood).toBe(mood);
            });

            // Clean up
            await Promise.all(
              createdPrompts.map((prompt) =>
                prisma.promptRecord.delete({ where: { id: prompt.id } })
              )
            );
            await Promise.all(apiKeys.map((key) => prisma.apiKey.delete({ where: { id: key.id } })));
            await Promise.all(
              templates.map((template) => prisma.beatTemplate.delete({ where: { id: template.id } }))
            );
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should retrieve prompts by tags', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 3, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
          fc.array(createPromptDataArb, { minLength: 2, maxLength: 4 }),
          async (searchTags, promptDataArray) => {
            // Create templates
            const templates = await Promise.all(
              promptDataArray.map((data) =>
                prisma.beatTemplate.create({
                  data: {
                    id: data.templateId,
                    categoryName: `Test Category ${data.templateId}`,
                    genre: 'Test Genre',
                    style: 'Test Style',
                    mood: 'Test Mood',
                    useCase: 'Test Use Case',
                    tags: ['test'],
                    basePrompt: 'Test base prompt',
                  },
                })
              )
            );

            // Create API keys and prompts with specific tags
            const apiKeys = await Promise.all(
              promptDataArray.map((data) =>
                prisma.apiKey.create({
                  data: {
                    id: data.apiKeyUsed,
                    key: `test-key-${data.apiKeyUsed}`,
                    status: 'active',
                    quotaRemaining: 100,
                  },
                })
              )
            );

            const createdPrompts = await Promise.all(
              promptDataArray.map((data) =>
                promptRepository.create({
                  ...data,
                  tags: [...searchTags, ...data.tags],
                })
              )
            );

            // Query by tags
            const results = await promptRepository.query({ tags: searchTags });

            // All results should contain at least one of the search tags
            expect(results.length).toBeGreaterThanOrEqual(createdPrompts.length);
            results.forEach((result) => {
              const resultTags = result.tags as string[];
              const hasMatchingTag = searchTags.some((tag) => resultTags.includes(tag));
              expect(hasMatchingTag).toBe(true);
            });

            // Clean up
            await Promise.all(
              createdPrompts.map((prompt) =>
                prisma.promptRecord.delete({ where: { id: prompt.id } })
              )
            );
            await Promise.all(apiKeys.map((key) => prisma.apiKey.delete({ where: { id: key.id } })));
            await Promise.all(
              templates.map((template) => prisma.beatTemplate.delete({ where: { id: template.id } }))
            );
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
