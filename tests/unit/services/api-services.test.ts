import { ConceptService } from '../../../src/services/concept.service';
import { PromptService } from '../../../src/services/prompt.service';
import { MusicService } from '../../../src/services/music.service';
import { MetadataService } from '../../../src/services/metadata.service';
import { BeatTemplate, ConceptData } from '../../../src/types/beat.types';

describe('API Services Unit Tests', () => {
  const mockTemplate: BeatTemplate = {
    id: 'test-template',
    categoryName: 'Test Beat',
    genre: 'Lo-fi',
    style: 'Chill',
    mood: 'Relaxed',
    useCase: 'Study',
    tags: ['test', 'lofi'],
    basePrompt: 'Create a chill lofi beat',
    isActive: true
  };

  describe('ConceptService', () => {
    const conceptService = new ConceptService();

    it('should generate concept data', async () => {
      const result = await conceptService.generateConcept(mockTemplate);

      expect(result).toBeDefined();
      expect(result.suggestion).toBeDefined();
      expect(result.trendAnalysis).toBeDefined();
      expect(result.moodEnhancement).toBeDefined();
    });
  });

  describe('PromptService', () => {
    const promptService = new PromptService();

    it('should normalize prompt', async () => {
      const mockConcept: ConceptData = {
        suggestion: 'Add vinyl texture',
        trendAnalysis: 'Lofi is trending',
        moodEnhancement: 'Emphasize chill vibes'
      };

      const result = await promptService.normalizePrompt(
        mockTemplate.basePrompt,
        mockConcept
      );

      expect(result).toBeDefined();
      expect(result.normalizedPrompt).toBeDefined();
      expect(result.additionalTags).toBeDefined();
      expect(Array.isArray(result.additionalTags)).toBe(true);
    });
  });

  describe('MusicService', () => {
    const musicService = new MusicService();

    it('should generate music and return job info', async () => {
      const result = await musicService.generateMusic(
        'test prompt',
        'test-api-key'
      );

      expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
      expect(result.fileUrl).toBeDefined();
    }, 30000);
  });

  describe('MetadataService', () => {
    const metadataService = new MetadataService();

    it('should generate complete metadata', async () => {
      const result = await metadataService.generateMetadata(
        mockTemplate,
        'test prompt'
      );

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.tags).toBeDefined();
      expect(result.description).toBeDefined();
      expect(Array.isArray(result.tags)).toBe(true);
    });

    it('should generate unique names', async () => {
      const name1 = await metadataService.generateName(mockTemplate, 'prompt1');
      const name2 = await metadataService.generateName(mockTemplate, 'prompt2');

      expect(name1).toBeDefined();
      expect(name2).toBeDefined();
      // Names should be different due to timestamp
      expect(name1).not.toBe(name2);
    });

    it('should generate tags array', async () => {
      const tags = await metadataService.generateTags(mockTemplate, 'test prompt');

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should generate description', async () => {
      const description = await metadataService.generateDescription(
        mockTemplate,
        'test prompt'
      );

      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });
});
