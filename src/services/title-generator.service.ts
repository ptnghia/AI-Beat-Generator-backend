import { BeatTemplate } from '../types/beat.types';
import { loggingService } from './logging.service';

/**
 * Title generation patterns for BeatStars optimization
 */
export class TitleGeneratorService {
  // Artist references - REMOVED to comply with BeatStars guidelines
  // BeatStars guide section 3.1: "Tránh tên nghệ sĩ thật (Drake, Travis Scott)"
  // Keeping for potential future use in descriptions (with proper disclaimers)
  private artistReferences: Record<string, string[]> = {
    // Not used in titles anymore to avoid copyright issues
  };

  // Mood-based descriptive words
  private moodDescriptors: Record<string, string[]> = {
    'Dark': ['Shadows', 'Midnight', 'Noir', 'Eclipse', 'Abyss', 'Phantom'],
    'Aggressive': ['Rage', 'Fury', 'Storm', 'Thunder', 'Chaos', 'Havoc'],
    'Chill': ['Waves', 'Breeze', 'Sunset', 'Dreams', 'Float', 'Drift'],
    'Uplifting': ['Rise', 'Ascend', 'Soar', 'Elevate', 'Shine', 'Glow'],
    'Melancholic': ['Rain', 'Tears', 'Memories', 'Lost', 'Fading', 'Echo'],
    'Energetic': ['Pulse', 'Rush', 'Blaze', 'Spark', 'Fire', 'Lightning'],
    'Mysterious': ['Enigma', 'Cipher', 'Veil', 'Mystic', 'Riddle', 'Secret'],
    'Romantic': ['Hearts', 'Love', 'Passion', 'Desire', 'Embrace', 'Forever']
  };

  // Genre-specific words
  private genreWords: Record<string, string[]> = {
    'Drill': ['Streets', 'Block', 'Zone', 'City', 'Hood', 'Trap'],
    'Trap': ['Flex', 'Drip', 'Wave', 'Sauce', 'Vibe', 'Mode'],
    'Lo-fi': ['Study', 'Chill', 'Cafe', 'Night', 'Rain', 'Cozy'],
    'Afrobeats': ['Rhythm', 'Dance', 'Groove', 'Vibe', 'Party', 'Move'],
    'Boom Bap': ['Classic', 'Golden', 'Raw', 'Pure', 'Real', 'True'],
    'R&B': ['Smooth', 'Silk', 'Soul', 'Velvet', 'Intimate', 'Late Night'],
    'Cinematic': ['Epic', 'Grand', 'Majestic', 'Powerful', 'Dramatic', 'Intense'],
    'Ambient': ['Space', 'Cosmos', 'Ethereal', 'Tranquil', 'Serene', 'Peaceful']
  };

  /**
   * Generate professional title for beat
   * Returns catchy, SEO-optimized title without timestamps or artist names
   * NOTE: No artist references to comply with BeatStars guidelines
   */
  generateTitle(template: BeatTemplate, conceptData?: any): string {
    try {
      // Choose random pattern (no artist references)
      const patterns = [
        this.generateTypePattern,
        this.generateMoodPattern,
        this.generateDescriptivePattern,
        this.generateArtistPattern, // Now generates genre-based titles
        this.generateSimplePattern
      ];

      const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
      const title = randomPattern.call(this, template, conceptData);

      loggingService.info('Generated professional title (no artist names)', {
        service: 'TitleGeneratorService',
        genre: template.genre,
        mood: template.mood,
        title
      });

      return title;
    } catch (error) {
      loggingService.logError('TitleGeneratorService', error as Error, {
        templateId: template.id
      });
      // Fallback to simple pattern
      return this.generateSimplePattern(template);
    }
  }

  /**
   * Pattern 1: "[Genre] Type Beat - [Mood Word]"
   * Example: "UK Drill Type Beat - Dark Streets"
   */
  private generateTypePattern(template: BeatTemplate, conceptData?: any): string {
    const moodWord = this.getMoodWord(template.mood);
    const genreWord = this.getGenreWord(template.genre);
    
    return `${template.genre} Type Beat - ${moodWord} ${genreWord}`;
  }

  /**
   * Pattern 2: "[Mood Word] [Genre Word]"
   * Example: "Dark Streets", "Midnight Vibes"
   */
  private generateMoodPattern(template: BeatTemplate, conceptData?: any): string {
    const moodWord = this.getMoodWord(template.mood);
    const genreWord = this.getGenreWord(template.genre);
    
    return `${moodWord} ${genreWord}`;
  }

  /**
   * Pattern 3: "[Descriptive] [Genre] Beat"
   * Example: "Aggressive UK Drill Beat", "Chill Lo-fi Beat"
   */
  private generateDescriptivePattern(template: BeatTemplate, conceptData?: any): string {
    return `${template.mood} ${template.genre} Beat`;
  }

  /**
   * Pattern 4: "[Genre] [Mood] Type Beat"
   * Example: "Dark Drill Type Beat", "Chill Trap Type Beat"
   * NOTE: Removed artist references to avoid copyright issues on BeatStars
   */
  private generateArtistPattern(template: BeatTemplate, conceptData?: any): string {
    const moodWord = this.getMoodWord(template.mood);
    
    // Use genre + mood instead of artist name
    return `${moodWord} ${template.genre} Type Beat`;
  }

  /**
   * Pattern 5: Simple "[Mood Word]"
   * Example: "Shadows", "Thunder", "Dreams"
   */
  private generateSimplePattern(template: BeatTemplate, conceptData?: any): string {
    return this.getMoodWord(template.mood);
  }

  /**
   * Get random mood-based word
   */
  private getMoodWord(mood: string): string {
    const words = this.moodDescriptors[mood] || ['Vibe', 'Energy', 'Flow'];
    return words[Math.floor(Math.random() * words.length)];
  }

  /**
   * Get random genre-specific word
   */
  private getGenreWord(genre: string): string {
    const words = this.genreWords[genre] || ['Beat', 'Track', 'Instrumental'];
    return words[Math.floor(Math.random() * words.length)];
  }

  /**
   * Get random artist reference for genre
   * DEPRECATED: Not used anymore to comply with BeatStars guidelines
   */
  private getArtistReference(genre: string): string | null {
    // No longer returning artist names to avoid copyright issues
    return null;
  }

  /**
   * Get all artist references for a genre
   * DEPRECATED: Not used in titles to comply with BeatStars guidelines
   * May be used in descriptions with proper disclaimers in future
   */
  getArtistReferencesForGenre(genre: string): string[] {
    // Return empty array - no artist references in titles
    return [];
  }

  /**
   * Validate title doesn't contain timestamps or unwanted patterns
   */
  validateTitle(title: string): boolean {
    // Check for timestamps
    if (/\d{10,}/.test(title)) {
      return false;
    }

    // Check for unwanted patterns
    const unwantedPatterns = [
      /beat \d+$/i,  // "Beat 123456"
      /\d{4}-\d{2}-\d{2}/,  // Date patterns
      /\d+$/  // Ending with numbers
    ];

    for (const pattern of unwantedPatterns) {
      if (pattern.test(title)) {
        return false;
      }
    }

    return true;
  }
}
