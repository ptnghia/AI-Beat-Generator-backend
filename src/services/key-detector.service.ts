import { BeatTemplate } from '../types/beat.types';
import { loggingService } from './logging.service';

/**
 * Musical key detection and assignment service
 * Maps mood and genre to appropriate musical keys
 */
export class KeyDetectorService {
  // Musical keys organized by mood characteristics
  private moodToKeys: Record<string, string[]> = {
    // Dark/Aggressive moods prefer minor keys
    'Dark': ['C Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor', 'A Minor', 'B Minor'],
    'Aggressive': ['C Minor', 'D Minor', 'E Minor', 'F# Minor', 'G Minor', 'A Minor'],
    'Melancholic': ['A Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor', 'B Minor'],
    'Mysterious': ['C# Minor', 'D# Minor', 'F# Minor', 'G# Minor', 'A# Minor'],
    'Sad': ['A Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor'],
    
    // Uplifting/Happy moods prefer major keys
    'Uplifting': ['C Major', 'D Major', 'E Major', 'F Major', 'G Major', 'A Major'],
    'Energetic': ['C Major', 'D Major', 'E Major', 'G Major', 'A Major', 'B Major'],
    'Happy': ['C Major', 'D Major', 'F Major', 'G Major', 'A Major'],
    'Romantic': ['C Major', 'D Major', 'E Major', 'F Major', 'G Major', 'A Major'],
    
    // Chill/Calm can use both
    'Chill': ['C Major', 'D Major', 'F Major', 'G Major', 'A Minor', 'D Minor'],
    'Calm': ['C Major', 'F Major', 'G Major', 'A Minor', 'D Minor', 'E Minor'],
    'Relaxed': ['C Major', 'F Major', 'G Major', 'A Minor', 'D Minor']
  };

  // Genre-specific key preferences
  private genreToKeys: Record<string, string[]> = {
    'Drill': ['C Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor', 'A Minor'],
    'Trap': ['C Minor', 'D Minor', 'E Minor', 'F# Minor', 'G Minor', 'A Minor', 'B Minor'],
    'Lo-fi': ['C Major', 'D Major', 'F Major', 'G Major', 'A Minor', 'D Minor', 'E Minor'],
    'Afrobeats': ['C Major', 'D Major', 'E Major', 'F Major', 'G Major', 'A Major'],
    'Boom Bap': ['C Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor', 'A Minor'],
    'R&B': ['C Major', 'D Major', 'E Major', 'F Major', 'G Major', 'A Minor', 'D Minor'],
    'Cinematic': ['C Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor', 'A Minor', 'B Minor'],
    'Ambient': ['C Major', 'D Major', 'F Major', 'G Major', 'A Minor', 'D Minor'],
    'House': ['C Major', 'D Major', 'F Major', 'G Major', 'A Minor'],
    'Reggaeton': ['C Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor', 'A Minor']
  };

  // Popular keys for specific BPM ranges
  private bpmToKeys: Record<string, string[]> = {
    'slow': ['C Minor', 'D Minor', 'A Minor', 'E Minor'], // < 90 BPM
    'medium': ['C Major', 'D Major', 'G Major', 'A Minor', 'D Minor'], // 90-130 BPM
    'fast': ['C Major', 'D Major', 'E Major', 'G Major', 'A Major'] // > 130 BPM
  };

  /**
   * Detect/assign musical key for a beat
   * Uses intelligent mapping based on mood, genre, and BPM
   */
  detectKey(template: BeatTemplate, bpm?: number): string {
    try {
      // Get candidate keys from mood
      const moodKeys = this.getKeysForMood(template.mood);
      
      // Get candidate keys from genre
      const genreKeys = this.getKeysForGenre(template.genre);
      
      // Get candidate keys from BPM if available
      const bpmKeys = bpm ? this.getKeysForBPM(bpm) : [];

      // Find intersection of mood and genre keys
      let candidateKeys = moodKeys.filter(key => genreKeys.includes(key));

      // If no intersection, use mood keys (mood is more important for key)
      if (candidateKeys.length === 0) {
        candidateKeys = moodKeys;
      }

      // Further filter by BPM if available
      if (bpmKeys.length > 0) {
        const bpmFiltered = candidateKeys.filter(key => bpmKeys.includes(key));
        if (bpmFiltered.length > 0) {
          candidateKeys = bpmFiltered;
        }
      }

      // Select random key from candidates
      const selectedKey = candidateKeys[Math.floor(Math.random() * candidateKeys.length)];

      loggingService.info('Musical key detected', {
        service: 'KeyDetectorService',
        genre: template.genre,
        mood: template.mood,
        bpm,
        selectedKey,
        candidatesCount: candidateKeys.length
      });

      return selectedKey;
    } catch (error) {
      loggingService.logError('KeyDetectorService', error as Error, {
        templateId: template.id
      });
      
      // Fallback to common keys
      return this.getFallbackKey(template.mood);
    }
  }

  /**
   * Get keys for a specific mood
   */
  private getKeysForMood(mood: string): string[] {
    // Try exact match first
    if (this.moodToKeys[mood]) {
      return this.moodToKeys[mood];
    }

    // Try partial match (e.g., "Calm / Sleep" matches "Calm")
    for (const [moodKey, keys] of Object.entries(this.moodToKeys)) {
      if (mood.toLowerCase().includes(moodKey.toLowerCase())) {
        return keys;
      }
    }

    // Default to minor keys for unknown moods
    return ['C Minor', 'D Minor', 'E Minor', 'A Minor'];
  }

  /**
   * Get keys for a specific genre
   */
  private getKeysForGenre(genre: string): string[] {
    // Try exact match first
    if (this.genreToKeys[genre]) {
      return this.genreToKeys[genre];
    }

    // Try partial match
    for (const [genreKey, keys] of Object.entries(this.genreToKeys)) {
      if (genre.toLowerCase().includes(genreKey.toLowerCase())) {
        return keys;
      }
    }

    // Default to all common keys
    return ['C Major', 'D Major', 'E Major', 'F Major', 'G Major', 'A Major', 
            'C Minor', 'D Minor', 'E Minor', 'F Minor', 'G Minor', 'A Minor'];
  }

  /**
   * Get keys for a specific BPM range
   */
  private getKeysForBPM(bpm: number): string[] {
    if (bpm < 90) {
      return this.bpmToKeys['slow'];
    } else if (bpm <= 130) {
      return this.bpmToKeys['medium'];
    } else {
      return this.bpmToKeys['fast'];
    }
  }

  /**
   * Get fallback key based on mood
   */
  private getFallbackKey(mood: string): string {
    // Dark/sad moods → A Minor (most common minor key)
    if (mood.toLowerCase().includes('dark') || 
        mood.toLowerCase().includes('sad') || 
        mood.toLowerCase().includes('aggressive')) {
      return 'A Minor';
    }

    // Happy/uplifting moods → C Major (most common major key)
    if (mood.toLowerCase().includes('happy') || 
        mood.toLowerCase().includes('uplifting') || 
        mood.toLowerCase().includes('energetic')) {
      return 'C Major';
    }

    // Default to C Major
    return 'C Major';
  }

  /**
   * Extract BPM from prompt if available
   */
  extractBPMFromPrompt(prompt: string): number | undefined {
    // Look for patterns like "142 BPM", "142BPM", "142 bpm"
    const bpmMatch = prompt.match(/(\d{2,3})\s*bpm/i);
    if (bpmMatch) {
      return parseInt(bpmMatch[1], 10);
    }
    return undefined;
  }

  /**
   * Validate if a key string is valid
   */
  isValidKey(key: string): boolean {
    const validKeys = [
      'C Major', 'C# Major', 'D Major', 'D# Major', 'E Major', 'F Major', 
      'F# Major', 'G Major', 'G# Major', 'A Major', 'A# Major', 'B Major',
      'C Minor', 'C# Minor', 'D Minor', 'D# Minor', 'E Minor', 'F Minor',
      'F# Minor', 'G Minor', 'G# Minor', 'A Minor', 'A# Minor', 'B Minor'
    ];
    return validKeys.includes(key);
  }

  /**
   * Get all possible keys
   */
  getAllKeys(): string[] {
    return [
      'C Major', 'C# Major', 'D Major', 'D# Major', 'E Major', 'F Major', 
      'F# Major', 'G Major', 'G# Major', 'A Major', 'A# Major', 'B Major',
      'C Minor', 'C# Minor', 'D Minor', 'D# Minor', 'E Minor', 'F Minor',
      'F# Minor', 'G Minor', 'G# Minor', 'A Minor', 'A# Minor', 'B Minor'
    ];
  }
}
