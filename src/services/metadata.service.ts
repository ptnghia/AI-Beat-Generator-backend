import axios from 'axios';
import { BeatTemplate, BeatMetadata } from '../types/beat.types';
import { loggingService } from './logging.service';
import { withRetry } from '../utils/retry.util';
import { CircuitBreaker } from '../utils/circuit-breaker.util';
import { apiConfig } from '../config/api.config';
import { TitleGeneratorService } from './title-generator.service';
import { KeyDetectorService } from './key-detector.service';
import { DescriptionGeneratorService } from './description-generator.service';

export class MetadataService {
  private circuitBreaker: CircuitBreaker;
  private titleGenerator: TitleGeneratorService;
  private keyDetector: KeyDetectorService;
  private descriptionGenerator: DescriptionGeneratorService;

  constructor() {
    this.circuitBreaker = new CircuitBreaker('MetadataService');
    this.titleGenerator = new TitleGeneratorService();
    this.keyDetector = new KeyDetectorService();
    this.descriptionGenerator = new DescriptionGeneratorService();
  }

  /**
   * Generate complete metadata for beat
   */
  async generateMetadata(template: BeatTemplate, prompt: string): Promise<BeatMetadata> {
    try {
      // Generate name, tags, and key first
      const name = await this.generateName(template, prompt);
      const tags = await this.generateTags(template, prompt);
      
      // Detect musical key based on template and prompt
      const bpm = this.keyDetector.extractBPMFromPrompt(prompt);
      const key = this.keyDetector.detectKey(template, bpm);

      // Generate SEO-optimized description with all context
      const description = await this.generateDescription(template, prompt, name, bpm, key);

      return { name, tags, description, key };
    } catch (error) {
      loggingService.logError('MetadataService', error as Error, {
        templateId: template.id
      });
      throw error;
    }
  }

  /**
   * Generate unique beat name using professional title patterns
   * No timestamps, SEO-optimized, BeatStars-ready
   */
  async generateName(template: BeatTemplate, prompt: string): Promise<string> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            // Use TitleGeneratorService for professional titles
            const title = this.titleGenerator.generateTitle(template);

            // Validate title doesn't contain unwanted patterns
            if (!this.titleGenerator.validateTitle(title)) {
              loggingService.warn('Generated title failed validation, regenerating', {
                service: 'MetadataService',
                invalidTitle: title
              });
              // Fallback to simple pattern
              return `${template.mood} ${template.genre} Beat`;
            }

            // Simulate API call delay (for consistency with other methods)
            await new Promise(resolve => setTimeout(resolve, 100));

            return title;
          },
          undefined,
          'MetadataService'
        );
      });

      const executionTime = Date.now() - startTime;
      loggingService.logApiCall(
        'MetadataService',
        'generateName',
        { templateId: template.id, title: result },
        200,
        executionTime
      );

      return result;
    } catch (error) {
      loggingService.logError('MetadataService', error as Error, {
        context: 'generateName',
        templateId: template.id
      });
      throw error;
    }
  }

  /**
   * Generate BeatStars-optimized tags
   * Removes AI-related tags, adds relevant search tags
   */
  async generateTags(template: BeatTemplate, prompt: string): Promise<string[]> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            const tags: string[] = [];

            // 1. Genre tags (always include)
            tags.push(template.genre.toLowerCase());
            if (template.style && template.style !== template.genre) {
              tags.push(template.style.toLowerCase());
            }

            // 2. Mood tags
            tags.push(template.mood.toLowerCase());

            // 3. Use case tags
            if (template.useCase) {
              const useCaseTags = template.useCase.toLowerCase().split('/').map(t => t.trim());
              tags.push(...useCaseTags);
            }

            // 4. Add "type beat" for popular genres
            const typeBeatGenres = ['drill', 'trap', 'boom bap', 'lo-fi', 'afrobeats'];
            if (typeBeatGenres.some(g => template.genre.toLowerCase().includes(g))) {
              tags.push('type beat');
            }

            // 5. Add "beat" and "instrumental" (essential for BeatStars)
            tags.push('beat');
            tags.push('instrumental');

            // 6. Add tempo-based tags from BPM
            const bpmMatch = prompt.match(/(\d{2,3})\s*bpm/i);
            if (bpmMatch) {
              const bpm = parseInt(bpmMatch[1], 10);
              if (bpm < 90) {
                tags.push('slow');
              } else if (bpm > 140) {
                tags.push('fast');
              }
            }

            // 7. Add mood-specific descriptive tags
            const moodTags: Record<string, string[]> = {
              'dark': ['dark', 'moody'],
              'aggressive': ['hard', 'aggressive'],
              'chill': ['chill', 'relaxed'],
              'uplifting': ['uplifting', 'positive'],
              'sad': ['sad', 'emotional'],
              'romantic': ['romantic', 'love'],
              'energetic': ['energetic', 'hype']
            };

            for (const [mood, extraTags] of Object.entries(moodTags)) {
              if (template.mood.toLowerCase().includes(mood)) {
                tags.push(...extraTags);
                break;
              }
            }

            // 8. Add genre-specific tags
            const genreTags: Record<string, string[]> = {
              'drill': ['drill beat', 'uk drill'],
              'trap': ['trap beat', 'rap beat'],
              'lo-fi': ['lofi', 'study beat'],
              'afrobeats': ['afrobeat', 'afro'],
              'boom bap': ['boom bap', 'old school'],
              'r&b': ['rnb', 'smooth'],
              'ambient': ['ambient', 'atmospheric']
            };

            for (const [genre, extraTags] of Object.entries(genreTags)) {
              if (template.genre.toLowerCase().includes(genre)) {
                tags.push(...extraTags);
                break;
              }
            }

            // 9. Remove duplicates and AI-related tags
            const uniqueTags = Array.from(new Set(tags));
            const cleanTags = uniqueTags.filter(tag => 
              !tag.includes('ai-generated') &&
              !tag.includes('ai generated') &&
              !tag.includes('enhanced') &&
              !tag.includes('normalized') &&
              tag.length > 0
            );

            // 10. Limit to 10-15 tags (BeatStars recommendation)
            const finalTags = cleanTags.slice(0, 15);

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 100));

            loggingService.info('Generated BeatStars-optimized tags', {
              service: 'MetadataService',
              templateId: template.id,
              tagCount: finalTags.length,
              removedAITags: uniqueTags.length - cleanTags.length
            });

            return finalTags;
          },
          undefined,
          'MetadataService'
        );
      });

      const executionTime = Date.now() - startTime;
      loggingService.logApiCall(
        'MetadataService',
        'generateTags',
        { templateId: template.id, tagCount: result.length },
        200,
        executionTime
      );

      return result;
    } catch (error) {
      loggingService.logError('MetadataService', error as Error, {
        context: 'generateTags',
        templateId: template.id
      });
      throw error;
    }
  }

  /**
   * Generate SEO-optimized description for BeatStars
   * Includes: hook, artist references, features, licensing, CTA, hashtags
   */
  async generateDescription(template: BeatTemplate, prompt: string, beatName?: string, bpm?: number, key?: string): Promise<string> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            // Extract BPM from prompt if not provided
            const extractedBPM = bpm || this.keyDetector.extractBPMFromPrompt(prompt);
            
            // Use beat name if provided, otherwise generate a temporary one
            const name = beatName || this.titleGenerator.generateTitle(template);

            // Generate SEO-optimized description using DescriptionGeneratorService
            const description = this.descriptionGenerator.generateDescription(
              template,
              name,
              extractedBPM,
              key
            );

            // Simulate API call delay (for consistency)
            await new Promise(resolve => setTimeout(resolve, 100));

            return description;
          },
          undefined,
          'MetadataService'
        );
      });

      const executionTime = Date.now() - startTime;
      loggingService.logApiCall(
        'MetadataService',
        'generateDescription',
        { templateId: template.id, descriptionLength: result.length },
        200,
        executionTime
      );

      return result;
    } catch (error) {
      loggingService.logError('MetadataService', error as Error, {
        context: 'generateDescription',
        templateId: template.id
      });
      throw error;
    }
  }
}
