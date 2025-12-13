import axios from 'axios';
import { BeatTemplate, ConceptData } from '../types/beat.types';
import { loggingService } from './logging.service';
import { withRetry } from '../utils/retry.util';
import { CircuitBreaker } from '../utils/circuit-breaker.util';
import { apiConfig } from '../config/api.config';

export class ConceptService {
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker('ConceptService');
  }

  /**
   * Generate concept suggestion using Gemini API
   */
  async generateConcept(template: BeatTemplate): Promise<ConceptData> {
    const startTime = Date.now();

    try {
      // If no Gemini API key, use fallback
      if (!process.env.GEMINI_API_KEY) {
        loggingService.warn('Gemini API key not configured, using fallback', {
          service: 'ConceptService'
        });
        return this.generateFallbackConcept(template);
      }

      const result = await this.circuitBreaker.execute(async () => {
        return await withRetry(
          async () => {
            const response = await axios.post(
              `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
              {
                contents: [{
                  parts: [{
                    text: `You are a professional music producer and trend analyst. Generate a creative concept for a beat with these specifications:

Genre: ${template.genre}
Style: ${template.style}
Mood: ${template.mood}
Use Case: ${template.useCase}

Provide:
1. A detailed creative suggestion (2-3 sentences) with specific instrument recommendations, production techniques, and sonic characteristics
2. Current trend analysis (1-2 sentences) about this genre/style combination
3. Mood enhancement tips (1-2 sentences) with specific production advice

Format as JSON:
{
  "suggestion": "detailed creative concept with instruments and production tips",
  "trendAnalysis": "current trends in this genre/style",
  "moodEnhancement": "specific tips to enhance the mood"
}

Be specific about instruments (e.g., "Fender Rhodes", "Moog bass", "Roland TR-808") and production techniques (e.g., "half-time rhythm", "detuned synths", "vinyl crackle").`
                  }]
                }]
              },
              {
                headers: {
                  'Content-Type': 'application/json'
                },
                timeout: 30000
              }
            );

            const text = response.data.candidates[0].content.parts[0].text;
            
            // Extract JSON from response (sometimes Gemini wraps it in markdown)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error('No JSON found in Gemini response');
            }

            const concept = JSON.parse(jsonMatch[0]) as ConceptData;
            return concept;
          },
          undefined,
          'ConceptService'
        );
      });

      const executionTime = Date.now() - startTime;
      loggingService.logApiCall(
        'ConceptService',
        'generateConcept',
        { template: template.id },
        200,
        executionTime
      );

      return result;
    } catch (error) {
      loggingService.logError('ConceptService', error as Error, {
        templateId: template.id
      });
      
      // Fallback to template-based concept
      return this.generateFallbackConcept(template);
    }
  }

  /**
   * Generate concept without AI (fallback)
   */
  private generateFallbackConcept(template: BeatTemplate): ConceptData {
    return {
      suggestion: `Create a ${template.mood} ${template.genre} beat with ${template.style} influences. Use atmospheric elements and dynamic production techniques to capture the essence of ${template.useCase}.`,
      trendAnalysis: `${template.genre} with ${template.style} style is currently popular in ${template.useCase} scenarios. ${template.mood} vibes are trending.`,
      moodEnhancement: `Emphasize ${template.mood} atmosphere with carefully selected sounds and production effects. Layer instruments to create depth and emotional impact.`
    };
  }
}
