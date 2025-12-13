import { PrismaClient } from '@prisma/client';
import { PromptRepository, CreatePromptData } from '../../../src/repositories/prompt.repository';

const prisma = new PrismaClient();
const promptRepository = new PromptRepository(prisma);

describe('Prompt Repository Unit Tests', () => {
  let testTemplateId: string;
  let testApiKeyId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up - delete in correct order due to foreign keys
    await prisma.promptRecord.deleteMany({});
    await prisma.beat.deleteMany({});
    await prisma.beatTemplate.deleteMany({});
    await prisma.apiKey.deleteMany({});

    // Create test template
    const template = await prisma.beatTemplate.create({
      data: {
        categoryName: 'Test Category for Unit Tests',
        genre: 'Lo-fi',
        style: 'Chill',
        mood: 'Relaxed',
        useCase: 'Study',
        tags: ['study', 'chill', 'lofi'],
        basePrompt: 'Create a chill lo-fi beat',
      },
    });
    testTemplateId = template.id;

    // Create test API key
    const apiKey = await prisma.apiKey.create({
      data: {
        key: 'test-api-key-unit-tests',
        status: 'active',
        quotaRemaining: 100,
      },
    });
    testApiKeyId = apiKey.id;
  });

  afterEach(async () => {
    // Clean up - delete in correct order due to foreign keys
    await prisma.promptRecord.deleteMany({});
    await prisma.beat.deleteMany({});
    await prisma.beatTemplate.deleteMany({});
    await prisma.apiKey.deleteMany({});
  });

  describe('Prompt Versioning Logic', () => {
    it('should start version at 1 for first prompt', async () => {
      const promptData: CreatePromptData = {
        templateId: testTemplateId,
        basePrompt: 'Base prompt',
        normalizedPrompt: 'Normalized prompt',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      };

      const prompt = await promptRepository.create(promptData);
      expect(prompt.version).toBe(1);
    });

    it('should increment version for subsequent prompts', async () => {
      const promptData: CreatePromptData = {
        templateId: testTemplateId,
        basePrompt: 'Base prompt',
        normalizedPrompt: 'Normalized prompt',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      };

      const prompt1 = await promptRepository.create(promptData);
      const prompt2 = await promptRepository.create(promptData);
      const prompt3 = await promptRepository.create(promptData);

      expect(prompt1.version).toBe(1);
      expect(prompt2.version).toBe(2);
      expect(prompt3.version).toBe(3);
    });

    it('should maintain separate version sequences for different templates', async () => {
      // Create another template
      const template2 = await prisma.beatTemplate.create({
        data: {
          categoryName: 'Test Category 2',
          genre: 'Trap',
          style: 'Dark',
          mood: 'Aggressive',
          useCase: 'Rap',
          tags: ['trap', 'dark'],
          basePrompt: 'Create a dark trap beat',
        },
      });

      const promptData1: CreatePromptData = {
        templateId: testTemplateId,
        basePrompt: 'Base prompt 1',
        normalizedPrompt: 'Normalized prompt 1',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      };

      const promptData2: CreatePromptData = {
        templateId: template2.id,
        basePrompt: 'Base prompt 2',
        normalizedPrompt: 'Normalized prompt 2',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      };

      const prompt1a = await promptRepository.create(promptData1);
      const prompt2a = await promptRepository.create(promptData2);
      const prompt1b = await promptRepository.create(promptData1);
      const prompt2b = await promptRepository.create(promptData2);

      expect(prompt1a.version).toBe(1);
      expect(prompt2a.version).toBe(1);
      expect(prompt1b.version).toBe(2);
      expect(prompt2b.version).toBe(2);

      // Clean up - delete prompts first
      await prisma.promptRecord.deleteMany({ where: { templateId: template2.id } });
      await prisma.beatTemplate.delete({ where: { id: template2.id } });
    });
  });

  describe('Query with Multiple Filter Combinations', () => {
    beforeEach(async () => {
      // Create multiple templates with different attributes
      const templates = await Promise.all([
        prisma.beatTemplate.create({
          data: {
            categoryName: 'Lo-fi Chill',
            genre: 'Lo-fi',
            style: 'Chill',
            mood: 'Relaxed',
            useCase: 'Study',
            tags: ['study', 'chill'],
            basePrompt: 'Create a chill lo-fi beat',
          },
        }),
        prisma.beatTemplate.create({
          data: {
            categoryName: 'Trap Dark',
            genre: 'Trap',
            style: 'Dark',
            mood: 'Aggressive',
            useCase: 'Rap',
            tags: ['trap', 'dark'],
            basePrompt: 'Create a dark trap beat',
          },
        }),
        prisma.beatTemplate.create({
          data: {
            categoryName: 'Lo-fi Happy',
            genre: 'Lo-fi',
            style: 'Upbeat',
            mood: 'Happy',
            useCase: 'Background',
            tags: ['happy', 'upbeat'],
            basePrompt: 'Create a happy lo-fi beat',
          },
        }),
      ]);

      // Create prompts for each template
      for (const template of templates) {
        await promptRepository.create({
          templateId: template.id,
          basePrompt: template.basePrompt,
          normalizedPrompt: `Normalized: ${template.basePrompt}`,
          conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
          tags: template.tags as string[],
          apiKeyUsed: testApiKeyId,
          executionResult: 'success',
        });
      }
    });

    it('should filter by genre only', async () => {
      const results = await promptRepository.query({ genre: 'Lo-fi' });
      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.template.genre).toBe('Lo-fi');
      });
    });

    it('should filter by genre and mood', async () => {
      const results = await promptRepository.query({ genre: 'Lo-fi', mood: 'Relaxed' });
      expect(results.length).toBe(1);
      expect(results[0].template.genre).toBe('Lo-fi');
      expect(results[0].template.mood).toBe('Relaxed');
    });

    it('should filter by genre, style, and mood', async () => {
      const results = await promptRepository.query({
        genre: 'Lo-fi',
        style: 'Chill',
        mood: 'Relaxed',
      });
      expect(results.length).toBe(1);
      expect(results[0].template.genre).toBe('Lo-fi');
      expect(results[0].template.style).toBe('Chill');
      expect(results[0].template.mood).toBe('Relaxed');
    });

    it('should filter by tags', async () => {
      const results = await promptRepository.query({ tags: ['chill'] });
      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach((result) => {
        const tags = result.tags as string[];
        expect(tags).toContain('chill');
      });
    });

    it('should filter by execution result', async () => {
      // Create a failed prompt
      const template = await prisma.beatTemplate.findFirst();
      await promptRepository.create({
        templateId: template!.id,
        basePrompt: 'Failed prompt',
        normalizedPrompt: 'Failed normalized prompt',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['failed'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'failure',
        errorMessage: 'Test error',
      });

      const successResults = await promptRepository.query({ executionResult: 'success' });
      const failureResults = await promptRepository.query({ executionResult: 'failure' });

      expect(successResults.length).toBeGreaterThanOrEqual(3);
      expect(failureResults.length).toBe(1);
      expect(failureResults[0].executionResult).toBe('failure');
    });

    it('should return empty array when no matches found', async () => {
      const results = await promptRepository.query({ genre: 'NonExistentGenre' });
      expect(results).toEqual([]);
    });
  });

  describe('Prompt Retrieval with Missing Data', () => {
    it('should return null when prompt ID does not exist', async () => {
      const result = await promptRepository.findById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return empty array when template has no prompts', async () => {
      const results = await promptRepository.findByTemplateId(testTemplateId);
      expect(results).toEqual([]);
    });

    it('should return null when getting latest prompt for template with no prompts', async () => {
      const result = await promptRepository.findLatestByTemplateId(testTemplateId);
      expect(result).toBeNull();
    });

    it('should handle query with non-existent templateId', async () => {
      const results = await promptRepository.query({ templateId: 'non-existent-template-id' });
      expect(results).toEqual([]);
    });

    it('should handle date range query with no results', async () => {
      const futureDate = new Date('2099-01-01');
      const results = await promptRepository.query({ fromDate: futureDate });
      expect(results).toEqual([]);
    });
  });

  describe('Additional Repository Methods', () => {
    it('should update execution result', async () => {
      const prompt = await promptRepository.create({
        templateId: testTemplateId,
        basePrompt: 'Test prompt',
        normalizedPrompt: 'Test normalized prompt',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      });

      const updated = await promptRepository.updateExecutionResult(
        prompt.id,
        'failure',
        'Test error message'
      );

      expect(updated.executionResult).toBe('failure');
      expect(updated.errorMessage).toBe('Test error message');
    });

    it('should delete a prompt', async () => {
      const prompt = await promptRepository.create({
        templateId: testTemplateId,
        basePrompt: 'Test prompt',
        normalizedPrompt: 'Test normalized prompt',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      });

      await promptRepository.delete(prompt.id);

      const result = await promptRepository.findById(prompt.id);
      expect(result).toBeNull();
    });

    it('should get statistics', async () => {
      // Create successful prompts
      await promptRepository.create({
        templateId: testTemplateId,
        basePrompt: 'Test prompt 1',
        normalizedPrompt: 'Test normalized prompt 1',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      });

      await promptRepository.create({
        templateId: testTemplateId,
        basePrompt: 'Test prompt 2',
        normalizedPrompt: 'Test normalized prompt 2',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      });

      // Create failed prompt
      await promptRepository.create({
        templateId: testTemplateId,
        basePrompt: 'Test prompt 3',
        normalizedPrompt: 'Test normalized prompt 3',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'failure',
        errorMessage: 'Test error',
      });

      const stats = await promptRepository.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
    });

    it('should find prompts by API key', async () => {
      await promptRepository.create({
        templateId: testTemplateId,
        basePrompt: 'Test prompt',
        normalizedPrompt: 'Test normalized prompt',
        conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
        tags: ['test'],
        apiKeyUsed: testApiKeyId,
        executionResult: 'success',
      });

      const results = await promptRepository.findByApiKey(testApiKeyId);
      expect(results.length).toBe(1);
      expect(results[0].apiKeyUsed).toBe(testApiKeyId);
    });

    it('should paginate results', async () => {
      // Create 25 prompts
      for (let i = 0; i < 25; i++) {
        await promptRepository.create({
          templateId: testTemplateId,
          basePrompt: `Test prompt ${i}`,
          normalizedPrompt: `Test normalized prompt ${i}`,
          conceptData: { suggestion: 'test', trendAnalysis: 'test', moodEnhancement: 'test' },
          tags: ['test'],
          apiKeyUsed: testApiKeyId,
          executionResult: 'success',
        });
      }

      const page1 = await promptRepository.findAll(1, 20);
      const page2 = await promptRepository.findAll(2, 20);

      expect(page1.data.length).toBe(20);
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(20);

      expect(page2.data.length).toBe(5);
      expect(page2.total).toBe(25);
      expect(page2.page).toBe(2);
      expect(page2.pageSize).toBe(20);
    });
  });
});
