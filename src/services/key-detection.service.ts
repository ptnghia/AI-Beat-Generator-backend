import { loggingService } from './logging.service';

export interface KeyDetectionResult {
  key: string; // e.g., "C Major", "F Minor"
  keyLetter: string; // e.g., "C", "F#"
  mode: 'Major' | 'Minor';
  confidence: number;
  method: 'analysis' | 'estimated' | 'template';
}

export class KeyDetectionService {
  // Mapping of common mood/genre combinations to typical keys
  private readonly moodKeyMap = {
    dark: ['F Minor', 'C# Minor', 'D Minor', 'G Minor'],
    sad: ['D Minor', 'A Minor', 'E Minor', 'B Minor'],
    emotional: ['A Minor', 'E Minor', 'D Minor'],
    happy: ['C Major', 'G Major', 'D Major', 'A Major'],
    chill: ['G Major', 'D Major', 'A Minor', 'E Minor'],
    energetic: ['C Major', 'F Major', 'G Major'],
    romantic: ['C Major', 'F Major', 'Eb Major', 'Ab Major'],
    aggressive: ['E Minor', 'C# Minor', 'F# Minor'],
    melancholic: ['D Minor', 'B Minor', 'F# Minor'],
    uplifting: ['C Major', 'G Major', 'D Major', 'E Major']
  };

  // Genre-specific key preferences
  private readonly genreKeyMap = {
    'trap': ['F Minor', 'C# Minor', 'D# Minor', 'G# Minor'],
    'hip hop': ['D Minor', 'A Minor', 'E Minor', 'G Minor'],
    'drill': ['C# Minor', 'F# Minor', 'B Minor'],
    'r&b': ['C Major', 'F Major', 'Eb Major', 'Ab Major', 'D Minor'],
    'lofi': ['G Major', 'D Major', 'A Minor', 'C Major'],
    'boom bap': ['D Minor', 'A Minor', 'G Minor', 'E Minor']
  };

  private readonly allKeys = [
    'C Major', 'C Minor',
    'C# Major', 'C# Minor', 
    'D Major', 'D Minor',
    'D# Major', 'D# Minor', 'Eb Major', 'Eb Minor',
    'E Major', 'E Minor',
    'F Major', 'F Minor',
    'F# Major', 'F# Minor', 'Gb Major', 'Gb Minor',
    'G Major', 'G Minor',
    'G# Major', 'G# Minor', 'Ab Major', 'Ab Minor',
    'A Major', 'A Minor',
    'A# Major', 'A# Minor', 'Bb Major', 'Bb Minor',
    'B Major', 'B Minor'
  ];

  /**
   * Detect musical key from beat template data
   * This is an intelligent estimation based on genre, mood, and style
   */
  async detectKey(params: {
    genre: string;
    mood: string;
    style: string;
    audioFilePath?: string;
  }): Promise<KeyDetectionResult> {
    const startTime = Date.now();

    try {
      loggingService.info('Starting key detection', {
        service: 'KeyDetectionService',
        genre: params.genre,
        mood: params.mood
      });

      // If audio file is provided, try audio analysis first
      if (params.audioFilePath) {
        try {
          const result = await this.detectFromAudio(params.audioFilePath);
          loggingService.info('Key detected from audio', {
            service: 'KeyDetectionService',
            key: result.key,
            confidence: result.confidence,
            duration: Date.now() - startTime
          });
          return result;
        } catch (error) {
          loggingService.warn('Audio key detection failed, using estimation', {
            service: 'KeyDetectionService',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Estimate key from genre and mood
      const estimated = this.estimateKey(params.genre, params.mood, params.style);
      
      loggingService.info('Key estimated successfully', {
        service: 'KeyDetectionService',
        key: estimated.key,
        method: estimated.method,
        duration: Date.now() - startTime
      });

      return estimated;

    } catch (error) {
      loggingService.logError('KeyDetectionService', error as Error, params);
      throw error;
    }
  }

  /**
   * Detect key from audio file
   * Placeholder for future audio analysis implementation
   */
  private async detectFromAudio(audioFilePath: string): Promise<KeyDetectionResult> {
    // TODO: Implement actual audio analysis
    // For now, throw to use estimation
    throw new Error('Audio-based key detection not yet implemented');
  }

  /**
   * Estimate key based on genre and mood
   */
  private estimateKey(genre: string, mood: string, style: string): KeyDetectionResult {
    const genreLower = genre.toLowerCase();
    const moodLower = mood.toLowerCase();
    const styleLower = style.toLowerCase();

    let candidateKeys: string[] = [];

    // Get keys from mood
    for (const [moodKey, keys] of Object.entries(this.moodKeyMap)) {
      if (moodLower.includes(moodKey) || styleLower.includes(moodKey)) {
        candidateKeys.push(...keys);
      }
    }

    // Get keys from genre
    for (const [genreKey, keys] of Object.entries(this.genreKeyMap)) {
      if (genreLower.includes(genreKey) || styleLower.includes(genreKey)) {
        candidateKeys.push(...keys);
      }
    }

    // If no matches, use default based on mood tendency
    if (candidateKeys.length === 0) {
      if (this.isDarkMood(moodLower, styleLower)) {
        candidateKeys = ['F Minor', 'D Minor', 'A Minor'];
      } else {
        candidateKeys = ['C Major', 'G Major', 'D Major'];
      }
    }

    // Pick most common key from candidates
    const keyCount = new Map<string, number>();
    candidateKeys.forEach(key => {
      keyCount.set(key, (keyCount.get(key) || 0) + 1);
    });

    const sortedKeys = Array.from(keyCount.entries())
      .sort((a, b) => b[1] - a[1]);

    const selectedKey = sortedKeys[0][0];
    const confidence = sortedKeys[0][1] / candidateKeys.length;

    return this.parseKey(selectedKey, confidence, 'estimated');
  }

  /**
   * Check if mood/style is dark
   */
  private isDarkMood(mood: string, style: string): boolean {
    const darkKeywords = ['dark', 'sad', 'emotional', 'melancholic', 'aggressive', 'moody'];
    return darkKeywords.some(keyword => 
      mood.includes(keyword) || style.includes(keyword)
    );
  }

  /**
   * Parse key string into structured result
   */
  private parseKey(keyString: string, confidence: number, method: KeyDetectionResult['method']): KeyDetectionResult {
    const parts = keyString.split(' ');
    const keyLetter = parts[0];
    const mode = parts[1] as 'Major' | 'Minor';

    return {
      key: keyString,
      keyLetter,
      mode,
      confidence,
      method
    };
  }

  /**
   * Get key from template if already stored
   */
  getKeyFromTemplate(musicalKey: string | null): KeyDetectionResult | null {
    if (!musicalKey) return null;

    try {
      return this.parseKey(musicalKey, 1.0, 'template');
    } catch {
      return null;
    }
  }

  /**
   * Validate and normalize key format
   */
  validateKey(key: string): string {
    // Normalize format: "C Minor" not "c minor" or "Cminor"
    const normalized = key.trim()
      .split(' ')
      .map((part, i) => i === 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');

    // Check if valid
    if (!this.allKeys.includes(normalized)) {
      throw new Error(`Invalid key format: ${key}. Expected format: "C Major" or "F Minor"`);
    }

    return normalized;
  }

  /**
   * Convert enharmonic equivalents (e.g., C# = Db)
   */
  normalizeEnharmonic(key: string): string {
    const enharmonicMap: Record<string, string> = {
      'Db Major': 'C# Major',
      'Db Minor': 'C# Minor',
      'Eb Major': 'D# Major',
      'Eb Minor': 'D# Minor',
      'Gb Major': 'F# Major',
      'Gb Minor': 'F# Minor',
      'Ab Major': 'G# Major',
      'Ab Minor': 'G# Minor',
      'Bb Major': 'A# Major',
      'Bb Minor': 'A# Minor'
    };

    return enharmonicMap[key] || key;
  }

  /**
   * Get relative minor/major
   */
  getRelativeKey(key: string): string {
    const relativeMap: Record<string, string> = {
      'C Major': 'A Minor',
      'A Minor': 'C Major',
      'G Major': 'E Minor',
      'E Minor': 'G Major',
      'D Major': 'B Minor',
      'B Minor': 'D Major',
      'F Major': 'D Minor',
      'D Minor': 'F Major',
      // Add more as needed
    };

    return relativeMap[key] || key;
  }
}

export const keyDetectionService = new KeyDetectionService();
