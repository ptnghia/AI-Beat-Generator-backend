import OpenAI from 'openai';
import { ConceptData } from '../types/beat.types';
import { loggingService } from './logging.service';
import { withRetry } from '../utils/retry.util';
import { CircuitBreaker } from '../utils/circuit-breaker.util';

export interface PromptOptimizationParams {
  genre: string;
  style: string;
  mood: string;
  bpm?: number;
  key?: string;
  concept: ConceptData;
  basePrompt: string;
}

export interface PromptOptimizationResult {
  sunoPrompt: string; // Technical prompt for Suno API
  beatstarsTitle: string; // Marketing title for BeatStars
  beatstarsDescription: string; // SEO description
  additionalTags: string[];
}

export class PromptService {
  private openai: OpenAI;
  private circuitBreaker: CircuitBreaker;
  private model: string = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.circuitBreaker = new CircuitBreaker('PromptService');
  }

  /**
   * Optimize prompts for both Suno generation and BeatStars SEO
   */
  async optimizePrompt(params: PromptOptimizationParams): Promise<PromptOptimizationResult> {
    const startTime = Date.now();

    try {
      // If no OpenAI key, use fallback
      if (!process.env.OPENAI_API_KEY) {
        loggingService.warn('OpenAI API key not configured, using fallback', {
          service: 'PromptService'
        });
        return this.generateFallbackPrompts(params);
      }

      const result = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            const completion = await this.openai.chat.completions.create({
              model: this.model,
              messages: [
                {
                  role: 'system',
                  content: `You are an expert at optimizing prompts for Suno AI music generation and BeatStars marketplace SEO.

Your task: Generate TWO different outputs from the same concept:

1. SUNO PROMPT (Technical):
   - Format: [Genre] [SubGenre], [BPM] bpm, [Key], [Instruments], [Mood], [Style], instrumental only, no vocals
   - Be specific about instruments (e.g., "heavy 808 bass", "Fender Rhodes piano")
   - Include production techniques (e.g., "half-time rhythm", "detuned synths")
   - Always end with "instrumental only, no vocals"
   - Keep under 250 characters
   - Example: "Dark Trap Hip Hop, 140 bpm, F minor, heavy 808 bass, detuned synths, minimalist piano, atmospheric strings, menacing hi-hats, moody and aggressive, instrumental only, no vocals"

2. BEATSTARS TITLE (Marketing):
   - Format: [Main vibe] Type Beat – [Mood/Style]
   - No artist names (Drake, Travis Scott, etc.)
   - Keep under 60 characters
   - Example: "Midnight Streets Type Beat – Dark Trap"

3. BEATSTARS DESCRIPTION (SEO):
   - 2-3 lines max
   - Line 1: Description + use cases
   - Line 2: BPM: X | Key: Y
   - Line 3: "Instant download after purchase."
   - Keep under 200 characters

Return JSON:
{
  "sunoPrompt": "technical prompt for music generation",
  "beatstarsTitle": "SEO-optimized title",
  "beatstarsDescription": "short SEO description with BPM/Key",
  "additionalTags": ["keyword1", "keyword2", "keyword3"]
}`
                },
                {
                  role: 'user',
                  content: `Optimize prompts for:

Genre: ${params.genre}
Style: ${params.style}
Mood: ${params.mood}
${params.bpm ? `BPM: ${params.bpm}` : ''}
${params.key ? `Key: ${params.key}` : ''}

Base Prompt: ${params.basePrompt}

Creative Concept: ${params.concept.suggestion}
Mood Enhancement: ${params.concept.moodEnhancement}

Generate:
1. Suno AI prompt (technical, optimized for instrumental generation)
2. BeatStars title (marketing, SEO-friendly)
3. BeatStars description (with BPM and Key)
4. Additional keywords (3-5 words)`
                }
              ],
              response_format: { type: "json_object" },
              temperature: 0.7,
              max_tokens: 600
            });

            const content = completion.choices[0].message.content;
            if (!content) {
              throw new Error('No content in OpenAI response');
            }

            const parsed = JSON.parse(content);
            
            return {
              sunoPrompt: parsed.sunoPrompt,
              beatstarsTitle: parsed.beatstarsTitle,
              beatstarsDescription: parsed.beatstarsDescription,
              additionalTags: parsed.additionalTags || []
            };
          },
          undefined,
          'PromptService'
        );
      });

      const executionTime = Date.now() - startTime;
      loggingService.logApiCall(
        'PromptService',
        'optimizePrompt',
        { genre: params.genre },
        200,
        executionTime
      );

      return result;
    } catch (error) {
      loggingService.logError('PromptService', error as Error, {
        genre: params.genre
      });
      
      // Fallback to template-based prompts
      return this.generateFallbackPrompts(params);
    }
  }

  /**
   * Generate prompts without AI (fallback)
   */
  private generateFallbackPrompts(params: PromptOptimizationParams): PromptOptimizationResult {
    // Extract key instruments from concept
    const instruments = this.extractInstruments(params.concept.suggestion);
    
    // Build Suno prompt
    const sunoPrompt = `${params.genre} ${params.style}, ${params.bpm || 120} bpm, ${params.key || 'C minor'}, ${instruments}, ${params.mood}, instrumental only, no vocals`;

    // Build BeatStars title
    const titleMood = params.mood.charAt(0).toUpperCase() + params.mood.slice(1);
    const beatstarsTitle = `${titleMood} ${params.style} Type Beat – ${params.genre}`;

    // Build BeatStars description
    const beatstarsDescription = `${titleMood} ${params.genre.toLowerCase()} beat perfect for ${params.basePrompt.toLowerCase()}.\nBPM: ${params.bpm || 120} | Key: ${params.key || 'C Minor'}\nInstant download after purchase.`;

    return {
      sunoPrompt,
      beatstarsTitle,
      beatstarsDescription,
      additionalTags: [params.genre.toLowerCase(), params.mood.toLowerCase(), params.style.toLowerCase()]
    };
  }

  /**
   * Extract instruments from concept text
   */
  private extractInstruments(text: string): string {
    const commonInstruments = [
      '808 bass', 'piano', 'synth', 'strings', 'guitar', 'hi-hats', 
      'drums', 'bass', 'pads', 'bells', 'brass'
    ];

    const found = commonInstruments.filter(inst => 
      text.toLowerCase().includes(inst)
    );

    return found.length > 0 ? found.join(', ') : 'dynamic instrumentals';
  }

  /**
   * Legacy method for backward compatibility
   */
  async normalizePrompt(
    basePrompt: string,
    concept: ConceptData
  ): Promise<{ normalizedPrompt: string; additionalTags: string[] }> {
    const result = await this.optimizePrompt({
      genre: 'Hip Hop',
      style: 'Trap',
      mood: 'Dark',
      concept,
      basePrompt
    });

    return {
      normalizedPrompt: result.sunoPrompt,
      additionalTags: result.additionalTags
    };
  }
}

export const promptService = new PromptService();
