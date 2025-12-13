import OpenAI from 'openai';
import { loggingService } from './logging.service';
import { withRetry } from '../utils/retry.util';
import { CircuitBreaker } from '../utils/circuit-breaker.util';

export interface TagGenerationParams {
  genre: string;
  style: string;
  mood: string;
  bpm?: number;
  key?: string;
  instruments?: string[];
}

export interface TagGenerationResult {
  tags: string[];
  primaryTags: string[]; // Top 5 most important
  secondaryTags: string[]; // Additional 5-10
}

export class TagGeneratorService {
  private openai: OpenAI;
  private circuitBreaker: CircuitBreaker;
  private model: string = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.circuitBreaker = new CircuitBreaker('TagGeneratorService');
  }

  /**
   * Generate BeatStars-optimized tags
   * Returns 10-15 SEO-friendly tags
   */
  async generateTags(params: TagGenerationParams): Promise<TagGenerationResult> {
    const startTime = Date.now();

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            const completion = await this.openai.chat.completions.create({
              model: this.model,
              messages: [
                {
                  role: 'system',
                  content: `You are a BeatStars SEO expert specializing in beat tagging for maximum discoverability. Generate 10-15 tags following these rules:

1. Tag Formula:
   - {mood} {genre} beat
   - {tempo} {style} beat
   - {instrument} beat
   - {bpm} bpm {genre}
   - {key} beat
   - type beat keywords

2. Examples:
   - "chill trap beat"
   - "dark hip hop instrumental"
   - "140 bpm trap"
   - "sad piano beat"
   - "melodic trap beat"

3. Guidelines:
   - All lowercase
   - No artist names (Drake, Travis Scott, etc.)
   - Focus on mood, genre, tempo, instruments
   - Include "type beat" variations
   - Include BPM if provided
   - Include musical key if provided
   - Max 4 words per tag
   - Total 10-15 tags

4. Prioritize:
   - Primary tags (top 5): Main genre/mood combinations
   - Secondary tags (5-10): Specific instruments, BPM, style variations

Return JSON format:
{
  "primaryTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "secondaryTags": ["tag6", "tag7", "tag8", "tag9", "tag10"]
}`
                },
                {
                  role: 'user',
                  content: `Generate BeatStars tags for:

Genre: ${params.genre}
Style: ${params.style}
Mood: ${params.mood}
${params.bpm ? `BPM: ${params.bpm}` : ''}
${params.key ? `Key: ${params.key}` : ''}
${params.instruments && params.instruments.length > 0 ? `Instruments: ${params.instruments.join(', ')}` : ''}

Generate 10-15 SEO-optimized tags for BeatStars marketplace.`
                }
              ],
              response_format: { type: "json_object" },
              temperature: 0.7,
              max_tokens: 500
            });

            const content = completion.choices[0].message.content;
            if (!content) {
              throw new Error('No content in OpenAI response');
            }

            const parsed = JSON.parse(content);
            
            // Combine and validate
            const allTags = [
              ...parsed.primaryTags,
              ...parsed.secondaryTags
            ];

            // Ensure all tags are lowercase and reasonable length
            const validatedTags = allTags
              .map((tag: string) => tag.toLowerCase().trim())
              .filter((tag: string) => tag.length > 0 && tag.split(' ').length <= 4)
              .slice(0, 15); // Max 15 tags

            return {
              tags: validatedTags,
              primaryTags: parsed.primaryTags.slice(0, 5),
              secondaryTags: parsed.secondaryTags.slice(0, 10)
            };
          },
          undefined,
          'TagGeneratorService'
        );
      });

      const executionTime = Date.now() - startTime;
      loggingService.logApiCall(
        'TagGeneratorService',
        'generateTags',
        params,
        200,
        executionTime
      );

      return result;

    } catch (error) {
      loggingService.logError('TagGeneratorService', error as Error, params);
      
      // Fallback to template-based tags
      return this.generateFallbackTags(params);
    }
  }

  /**
   * Generate fallback tags without AI
   */
  private generateFallbackTags(params: TagGenerationParams): TagGenerationResult {
    const tags: string[] = [];

    // Genre + mood combinations
    tags.push(`${params.mood.toLowerCase()} ${params.genre.toLowerCase()} beat`);
    tags.push(`${params.genre.toLowerCase()} ${params.style.toLowerCase()} beat`);
    tags.push(`${params.mood.toLowerCase()} ${params.style.toLowerCase()}`);

    // Genre variations
    tags.push(`${params.genre.toLowerCase()} instrumental`);
    tags.push(`${params.genre.toLowerCase()} beat`);
    
    // Type beat
    tags.push('type beat');
    tags.push(`${params.genre.toLowerCase()} type beat`);

    // BPM if available
    if (params.bpm) {
      tags.push(`${params.bpm} bpm`);
      tags.push(`${params.bpm} bpm ${params.genre.toLowerCase()}`);
    }

    // Key if available
    if (params.key) {
      tags.push(`${params.key.toLowerCase()} beat`);
    }

    // Instruments if available
    if (params.instruments && params.instruments.length > 0) {
      params.instruments.slice(0, 2).forEach(instrument => {
        tags.push(`${instrument.toLowerCase()} beat`);
      });
    }

    // Mood variations
    tags.push(`${params.mood.toLowerCase()} beat`);
    tags.push(`${params.mood.toLowerCase()} instrumental`);

    // Deduplicate and limit
    const uniqueTags = [...new Set(tags)].slice(0, 15);

    return {
      tags: uniqueTags,
      primaryTags: uniqueTags.slice(0, 5),
      secondaryTags: uniqueTags.slice(5)
    };
  }

  /**
   * Validate tags for BeatStars compliance
   */
  validateTags(tags: string[]): string[] {
    const forbidden = [
      // Artist names (common ones)
      'drake', 'travis scott', 'lil', 'kanye', 'eminem',
      // Brands
      'spotify', 'apple music', 'beatstars',
      // Inappropriate
      'free', 'download', 'mp3', 'wav'
    ];

    return tags.filter(tag => {
      const lower = tag.toLowerCase();
      return !forbidden.some(word => lower.includes(word));
    });
  }

  /**
   * Get suggested tags based on top performers
   */
  getSuggestedTags(genre: string): string[] {
    const suggestions: Record<string, string[]> = {
      'trap': [
        'trap beat',
        'hard trap',
        '808 trap',
        'melodic trap',
        'dark trap beat',
        'trap instrumental'
      ],
      'hip hop': [
        'hip hop beat',
        'rap beat',
        'boom bap',
        'hip hop instrumental',
        'rap instrumental',
        'old school hip hop'
      ],
      'drill': [
        'drill beat',
        'uk drill',
        'drill instrumental',
        'dark drill',
        'chicago drill',
        'drill type beat'
      ],
      'r&b': [
        'r&b beat',
        'rnb beat',
        'soul beat',
        'smooth r&b',
        'melodic r&b',
        'r&b instrumental'
      ],
      'lofi': [
        'lofi beat',
        'lofi hip hop',
        'chill lofi',
        'study beats',
        'lofi instrumental',
        'chill beats'
      ]
    };

    return suggestions[genre.toLowerCase()] || [];
  }
}

export const tagGeneratorService = new TagGeneratorService();
