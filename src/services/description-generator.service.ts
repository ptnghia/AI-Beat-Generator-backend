import { BeatTemplate } from '../types/beat.types';
import { loggingService } from './logging.service';

/**
 * Artist References Database
 * Maps genres to popular artists for BeatStars SEO optimization
 */
const ARTIST_REFERENCES: Record<string, string[]> = {
  // UK Drill
  'drill': ['Central Cee', 'Headie One', 'Digga D', 'Pop Smoke', 'Fivio Foreign'],
  'uk drill': ['Central Cee', 'Headie One', 'Digga D', 'Unknown T', 'Tion Wayne'],
  
  // Trap
  'trap': ['Travis Scott', 'Future', 'Lil Baby', '21 Savage', 'Metro Boomin'],
  'dark trap': ['Travis Scott', 'Future', '21 Savage', 'Playboi Carti'],
  
  // Lo-fi
  'lo-fi': ['Joji', 'Powfu', 'Idealism', 'Tomppabeats', 'Kupla'],
  'lofi': ['Joji', 'Powfu', 'Idealism', 'Tomppabeats', 'Kupla'],
  'chill': ['Joji', 'Powfu', 'Idealism', 'Tomppabeats'],
  
  // Boom Bap
  'boom bap': ['Joey Bada$$', 'J. Cole', 'Kendrick Lamar', 'Logic', 'Nas'],
  'old school': ['Joey Bada$$', 'J. Cole', 'Nas', 'Wu-Tang Clan'],
  
  // Afrobeats
  'afrobeats': ['Burna Boy', 'Wizkid', 'Davido', 'Rema', 'Tems'],
  'afrobeat': ['Burna Boy', 'Wizkid', 'Davido', 'Rema', 'Tems'],
  
  // R&B
  'r&b': ['The Weeknd', 'Bryson Tiller', 'Frank Ocean', 'SZA', 'H.E.R.'],
  'rnb': ['The Weeknd', 'Bryson Tiller', 'Frank Ocean', 'SZA', 'H.E.R.'],
  
  // Pluggnb
  'pluggnb': ['Summrs', 'Kankan', 'Autumn!', 'Izaya Tiji'],
  'plugg': ['Summrs', 'Kankan', 'Autumn!', 'Izaya Tiji'],
  
  // Ambient/Cinematic
  'ambient': ['Hans Zimmer', 'Ólafur Arnalds', 'Max Richter', 'Nils Frahm'],
  'cinematic': ['Hans Zimmer', 'Ludwig Göransson', 'Trent Reznor', 'Atticus Ross'],
  
  // Pop
  'pop': ['The Weeknd', 'Dua Lipa', 'Ariana Grande', 'Post Malone'],
  
  // Reggaeton
  'reggaeton': ['Bad Bunny', 'J Balvin', 'Ozuna', 'Daddy Yankee'],
  
  // Default/Generic
  'default': ['Drake', 'Travis Scott', 'The Weeknd', 'Future']
};

/**
 * Beat Features Database
 * Maps moods and styles to descriptive features with emojis
 */
const BEAT_FEATURES: Record<string, string[]> = {
  // Mood-based features
  'dark': ['🌑 Dark atmospheric vibes', '🔥 Hard-hitting 808s', '⚡ Aggressive energy'],
  'aggressive': ['💥 Powerful drums', '🔥 Intense energy', '⚡ Hard-hitting bass'],
  'chill': ['☁️ Smooth melodies', '🌊 Relaxing vibes', '✨ Ambient textures'],
  'uplifting': ['☀️ Positive energy', '🎵 Catchy melodies', '✨ Bright atmosphere'],
  'sad': ['💔 Emotional depth', '🌧️ Melancholic vibes', '🎹 Piano-driven'],
  'romantic': ['❤️ Romantic atmosphere', '🌹 Smooth melodies', '✨ Dreamy textures'],
  'energetic': ['⚡ High energy', '🔥 Dynamic drums', '💥 Powerful bass'],
  
  // Style-based features
  'modern': ['🎛️ Modern production', '🔊 Clean mix', '✨ Professional sound'],
  'vintage': ['📻 Vintage vibes', '🎹 Classic sounds', '🎸 Retro feel'],
  'minimal': ['🎵 Minimal arrangement', '🔇 Clean production', '✨ Spacious mix'],
  'complex': ['🎼 Complex arrangement', '🎹 Rich instrumentation', '🎵 Layered sounds']
};

/**
 * Licensing Information Templates
 */
const LICENSING_INFO = {
  basic: 'Basic Lease: MP3 download, 2,500 streams',
  premium: 'Premium Lease: MP3 + WAV, 10,000 streams',
  unlimited: 'Unlimited Lease: MP3 + WAV + Stems, unlimited streams',
  exclusive: 'Exclusive Rights: Full ownership, all files included'
};

/**
 * Call-to-Action Templates
 */
const CTA_TEMPLATES = [
  '🎵 Download now and start creating!',
  '🔥 Get this beat before it\'s gone!',
  '💎 Elevate your music with this beat!',
  '🎤 Perfect for your next hit!',
  '⚡ Instant download available!',
  '🌟 Make this beat yours today!'
];

export class DescriptionGeneratorService {
  /**
   * Generate SEO-optimized description for BeatStars
   * Includes: hook, artist references, features, licensing, CTA, hashtags
   */
  generateDescription(template: BeatTemplate, beatName: string, bpm?: number, key?: string): string {
    try {
      const sections: string[] = [];

      // 1. Hook/Selling Point (attention grabber)
      const hook = this.generateHook(template, beatName);
      sections.push(hook);
      sections.push(''); // Empty line

      // 2. Artist References
      const artistRefs = this.getArtistReferences(template);
      if (artistRefs.length > 0) {
        const artistLine = `Perfect for artists like ${artistRefs.slice(0, 3).join(', ')} and more!`;
        sections.push(artistLine);
        sections.push(''); // Empty line
      }

      // 3. Beat Features with emojis
      sections.push('✨ BEAT FEATURES:');
      const features = this.getBeatFeatures(template, bpm, key);
      features.forEach(feature => sections.push(`• ${feature}`));
      sections.push(''); // Empty line

      // 4. Technical Specs
      sections.push('📊 TECHNICAL SPECS:');
      if (bpm) sections.push(`• BPM: ${bpm}`);
      if (key) sections.push(`• Key: ${key}`);
      sections.push(`• Genre: ${template.genre}`);
      sections.push(`• Style: ${template.style}`);
      sections.push(`• Mood: ${template.mood}`);
      sections.push(''); // Empty line

      // 5. Licensing Information
      sections.push('📜 LICENSING OPTIONS:');
      sections.push(`• ${LICENSING_INFO.basic}`);
      sections.push(`• ${LICENSING_INFO.premium}`);
      sections.push(`• ${LICENSING_INFO.unlimited}`);
      sections.push(`• ${LICENSING_INFO.exclusive}`);
      sections.push(''); // Empty line

      // 6. Use Cases
      if (template.useCase) {
        sections.push(`🎯 PERFECT FOR: ${template.useCase}`);
        sections.push(''); // Empty line
      }

      // 7. Call-to-Action
      const cta = this.getRandomCTA();
      sections.push(cta);
      sections.push(''); // Empty line

      // 8. Hashtags
      const hashtags = this.generateHashtags(template);
      sections.push(hashtags.join(' '));

      const description = sections.join('\n');

      loggingService.info('Generated SEO-optimized description', {
        service: 'DescriptionGeneratorService',
        templateId: template.id,
        beatName,
        descriptionLength: description.length
      });

      return description;
    } catch (error) {
      loggingService.logError('DescriptionGeneratorService', error as Error, {
        context: 'generateDescription',
        templateId: template.id
      });
      // Fallback to simple description
      return `${beatName} - A ${template.mood} ${template.genre} beat in ${template.style} style.`;
    }
  }

  /**
   * Generate attention-grabbing hook/selling point
   */
  private generateHook(template: BeatTemplate, beatName: string): string {
    const hooks = [
      `🔥 ${beatName} - Your next hit starts here!`,
      `💎 Premium ${template.genre} beat that stands out from the crowd!`,
      `⚡ ${beatName} - Professional quality, instant download!`,
      `🌟 Elevate your music with this ${template.mood} ${template.genre} masterpiece!`,
      `🎵 ${beatName} - The sound you've been searching for!`,
      `💥 Hard-hitting ${template.genre} beat ready for your vocals!`
    ];

    // Select hook based on mood
    if (template.mood.toLowerCase().includes('dark')) {
      return `🌑 ${beatName} - Dark, atmospheric ${template.genre} that hits different!`;
    } else if (template.mood.toLowerCase().includes('chill')) {
      return `☁️ ${beatName} - Smooth, relaxing ${template.genre} vibes!`;
    } else if (template.mood.toLowerCase().includes('aggressive')) {
      return `💥 ${beatName} - Aggressive ${template.genre} energy that demands attention!`;
    }

    // Random selection for other moods
    return hooks[Math.floor(Math.random() * hooks.length)];
  }

  /**
   * Get artist references for the genre
   */
  private getArtistReferences(template: BeatTemplate): string[] {
    const genre = template.genre.toLowerCase();
    
    // Try exact match first
    if (ARTIST_REFERENCES[genre]) {
      return ARTIST_REFERENCES[genre];
    }

    // Try partial match
    for (const [key, artists] of Object.entries(ARTIST_REFERENCES)) {
      if (genre.includes(key) || key.includes(genre)) {
        return artists;
      }
    }

    // Fallback to default
    return ARTIST_REFERENCES['default'];
  }

  /**
   * Get beat features based on mood and style
   */
  private getBeatFeatures(template: BeatTemplate, bpm?: number, key?: string): string[] {
    const features: string[] = [];
    const mood = template.mood.toLowerCase();
    const style = template.style.toLowerCase();

    // Add mood-based features
    for (const [moodKey, moodFeatures] of Object.entries(BEAT_FEATURES)) {
      if (mood.includes(moodKey)) {
        features.push(...moodFeatures);
        break;
      }
    }

    // Add style-based features
    for (const [styleKey, styleFeatures] of Object.entries(BEAT_FEATURES)) {
      if (style.includes(styleKey)) {
        features.push(...styleFeatures);
        break;
      }
    }

    // Add generic professional features if none matched
    if (features.length === 0) {
      features.push('🎛️ Professional production quality');
      features.push('🔊 Clean, balanced mix');
      features.push('✨ Radio-ready sound');
    }

    // Add BPM-based feature
    if (bpm) {
      if (bpm < 90) {
        features.push(`🐌 Slow tempo (${bpm} BPM) - perfect for emotional tracks`);
      } else if (bpm > 140) {
        features.push(`⚡ Fast tempo (${bpm} BPM) - high energy vibes`);
      } else {
        features.push(`🎵 Perfect tempo (${bpm} BPM)`);
      }
    }

    // Add key-based feature
    if (key) {
      features.push(`🎹 Musical key: ${key}`);
    }

    // Limit to 6-8 features
    return features.slice(0, 8);
  }

  /**
   * Get random call-to-action
   */
  private getRandomCTA(): string {
    return CTA_TEMPLATES[Math.floor(Math.random() * CTA_TEMPLATES.length)];
  }

  /**
   * Generate relevant hashtags
   */
  private generateHashtags(template: BeatTemplate): string[] {
    const hashtags: string[] = [];

    // Genre hashtags
    hashtags.push(`#${template.genre.replace(/\s+/g, '')}`);
    hashtags.push(`#${template.genre.replace(/\s+/g, '')}Beat`);

    // Style hashtags
    if (template.style !== template.genre) {
      hashtags.push(`#${template.style.replace(/\s+/g, '')}`);
    }

    // Mood hashtags
    hashtags.push(`#${template.mood.replace(/\s+/g, '')}`);

    // Common BeatStars hashtags
    hashtags.push('#TypeBeat');
    hashtags.push('#BeatStars');
    hashtags.push('#Instrumental');
    hashtags.push('#ProducerLife');
    hashtags.push('#BeatMaker');

    // Genre-specific hashtags
    const genreSpecific: Record<string, string[]> = {
      'drill': ['#UKDrill', '#DrillBeat', '#DrillMusic'],
      'trap': ['#TrapBeat', '#TrapMusic', '#HipHop'],
      'lo-fi': ['#LoFi', '#ChillBeats', '#StudyBeats'],
      'afrobeats': ['#Afrobeat', '#AfricanMusic', '#AfrobeatInstrumental'],
      'boom bap': ['#BoomBap', '#OldSchool', '#90sHipHop']
    };

    const genre = template.genre.toLowerCase();
    for (const [key, tags] of Object.entries(genreSpecific)) {
      if (genre.includes(key)) {
        hashtags.push(...tags);
        break;
      }
    }

    // Limit to 15 hashtags (BeatStars recommendation)
    return hashtags.slice(0, 15);
  }

  /**
   * Get artist references for a specific genre (public method)
   */
  getArtistReferencesForGenre(genre: string): string[] {
    return this.getArtistReferences({ genre } as BeatTemplate);
  }

  /**
   * Get all available genres with artist references
   */
  getAllGenresWithArtists(): Record<string, string[]> {
    return { ...ARTIST_REFERENCES };
  }
}

export const descriptionGeneratorService = new DescriptionGeneratorService();
