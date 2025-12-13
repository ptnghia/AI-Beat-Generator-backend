import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { BeatTemplate } from '../types/beat.types';
import { loggingService } from './logging.service';

/**
 * Cover art generation service for BeatStars
 * Generates 3000x3000px cover images matching genre/mood aesthetic
 */
export class CoverArtService {
  private readonly COVER_SIZE = 3000; // BeatStars requirement
  private readonly OUTPUT_DIR = process.env.COVER_OUTPUT_DIR || './output/covers';

  // Color schemes by genre/mood
  private colorSchemes: Record<string, { bg: string; primary: string; secondary: string; accent: string }> = {
    // Dark moods
    'dark': {
      bg: '#0a0a0a',
      primary: '#1a1a1a',
      secondary: '#ff0000',
      accent: '#ffffff'
    },
    'aggressive': {
      bg: '#1a0000',
      primary: '#330000',
      secondary: '#ff3333',
      accent: '#ffffff'
    },
    
    // Chill moods
    'chill': {
      bg: '#1a2332',
      primary: '#2d3e50',
      secondary: '#6c9bd1',
      accent: '#e8f4f8'
    },
    'calm': {
      bg: '#1e2838',
      primary: '#2c3e50',
      secondary: '#7fb3d5',
      accent: '#ecf0f1'
    },
    
    // Uplifting moods
    'uplifting': {
      bg: '#ff6b35',
      primary: '#f7931e',
      secondary: '#ffd23f',
      accent: '#ffffff'
    },
    'energetic': {
      bg: '#e63946',
      primary: '#f77f00',
      secondary: '#fcbf49',
      accent: '#ffffff'
    },
    
    // Genre-specific
    'drill': {
      bg: '#000000',
      primary: '#1a1a1a',
      secondary: '#ff0000',
      accent: '#ffffff'
    },
    'trap': {
      bg: '#0d0221',
      primary: '#1e0342',
      secondary: '#7209b7',
      accent: '#f72585'
    },
    'lo-fi': {
      bg: '#f4e8c1',
      primary: '#a0c1b8',
      secondary: '#709fb0',
      accent: '#726a95'
    },
    'afrobeats': {
      bg: '#ff6b35',
      primary: '#f7931e',
      secondary: '#ffd23f',
      accent: '#006d77'
    },
    'synthwave': {
      bg: '#0a0e27',
      primary: '#1a1f4d',
      secondary: '#ff006e',
      accent: '#00f5ff'
    },
    'ambient': {
      bg: '#2d3142',
      primary: '#4f5d75',
      secondary: '#bfc0c0',
      accent: '#ffffff'
    }
  };

  constructor() {
    // Ensure output directory exists
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      fs.mkdirSync(this.OUTPUT_DIR, { recursive: true });
    }
  }

  /**
   * Generate cover art for a beat
   */
  async generateCoverArt(
    beatName: string,
    template: BeatTemplate,
    beatId: string
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Create canvas
      const canvas = createCanvas(this.COVER_SIZE, this.COVER_SIZE);
      const ctx = canvas.getContext('2d');

      // Get color scheme
      const colors = this.getColorScheme(template);

      // Draw background
      this.drawBackground(ctx, colors);

      // Draw geometric patterns based on genre
      this.drawPatterns(ctx, template, colors);

      // Draw text (beat name)
      this.drawText(ctx, beatName, template, colors);

      // Draw genre/mood badges
      this.drawBadges(ctx, template, colors);

      // Save to file
      const filename = `${beatId}.png`;
      const filepath = path.join(this.OUTPUT_DIR, filename);
      
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(filepath, buffer);

      const executionTime = Date.now() - startTime;
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

      loggingService.info('Cover art generated', {
        service: 'CoverArtService',
        beatId,
        beatName,
        filepath,
        size: `${sizeMB} MB`,
        executionTime
      });

      return filepath;
    } catch (error) {
      loggingService.logError('CoverArtService', error as Error, {
        beatId,
        beatName
      });
      throw error;
    }
  }

  /**
   * Get color scheme based on genre and mood
   */
  private getColorScheme(template: BeatTemplate): { bg: string; primary: string; secondary: string; accent: string } {
    // Try genre first
    const genreKey = template.genre.toLowerCase();
    if (this.colorSchemes[genreKey]) {
      return this.colorSchemes[genreKey];
    }

    // Try mood
    const moodKey = template.mood.toLowerCase().split('/')[0].trim();
    if (this.colorSchemes[moodKey]) {
      return this.colorSchemes[moodKey];
    }

    // Default dark scheme
    return this.colorSchemes['dark'];
  }

  /**
   * Draw background with gradient
   */
  private drawBackground(
    ctx: CanvasRenderingContext2D,
    colors: { bg: string; primary: string; secondary: string; accent: string }
  ): void {
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, this.COVER_SIZE, this.COVER_SIZE);
    gradient.addColorStop(0, colors.bg);
    gradient.addColorStop(1, colors.primary);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.COVER_SIZE, this.COVER_SIZE);
  }

  /**
   * Draw geometric patterns based on genre
   */
  private drawPatterns(
    ctx: CanvasRenderingContext2D,
    template: BeatTemplate,
    colors: { bg: string; primary: string; secondary: string; accent: string }
  ): void {
    const genre = template.genre.toLowerCase();

    ctx.globalAlpha = 0.3;

    if (genre.includes('drill') || genre.includes('trap')) {
      // Sharp angular patterns
      this.drawAngularPattern(ctx, colors);
    } else if (genre.includes('lo-fi') || genre.includes('chill')) {
      // Soft circular patterns
      this.drawCircularPattern(ctx, colors);
    } else if (genre.includes('synthwave')) {
      // Grid/neon patterns
      this.drawGridPattern(ctx, colors);
    } else {
      // Default wave pattern
      this.drawWavePattern(ctx, colors);
    }

    ctx.globalAlpha = 1.0;
  }

  /**
   * Draw angular pattern (for drill/trap)
   */
  private drawAngularPattern(
    ctx: CanvasRenderingContext2D,
    colors: { bg: string; primary: string; secondary: string; accent: string }
  ): void {
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 8;

    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * this.COVER_SIZE, Math.random() * this.COVER_SIZE);
      ctx.lineTo(Math.random() * this.COVER_SIZE, Math.random() * this.COVER_SIZE);
      ctx.lineTo(Math.random() * this.COVER_SIZE, Math.random() * this.COVER_SIZE);
      ctx.stroke();
    }
  }

  /**
   * Draw circular pattern (for lo-fi/chill)
   */
  private drawCircularPattern(
    ctx: CanvasRenderingContext2D,
    colors: { bg: string; primary: string; secondary: string; accent: string }
  ): void {
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 6;

    for (let i = 0; i < 8; i++) {
      const x = Math.random() * this.COVER_SIZE;
      const y = Math.random() * this.COVER_SIZE;
      const radius = 200 + Math.random() * 400;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * Draw grid pattern (for synthwave)
   */
  private drawGridPattern(
    ctx: CanvasRenderingContext2D,
    colors: { bg: string; primary: string; secondary: string; accent: string }
  ): void {
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 4;

    const spacing = 300;
    
    // Vertical lines
    for (let x = 0; x < this.COVER_SIZE; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.COVER_SIZE);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < this.COVER_SIZE; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.COVER_SIZE, y);
      ctx.stroke();
    }
  }

  /**
   * Draw wave pattern (default)
   */
  private drawWavePattern(
    ctx: CanvasRenderingContext2D,
    colors: { bg: string; primary: string; secondary: string; accent: string }
  ): void {
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 10;

    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const yOffset = (i * this.COVER_SIZE) / 5;
      
      for (let x = 0; x < this.COVER_SIZE; x += 50) {
        const y = yOffset + Math.sin(x / 200) * 200;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }

  /**
   * Draw beat name text
   */
  private drawText(
    ctx: CanvasRenderingContext2D,
    beatName: string,
    template: BeatTemplate,
    colors: { bg: string; primary: string; secondary: string; accent: string }
  ): void {
    // Main title
    ctx.fillStyle = colors.accent;
    ctx.font = 'bold 180px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap if needed
    const maxWidth = this.COVER_SIZE - 400;
    const words = beatName.split(' ');
    let line = '';
    let y = this.COVER_SIZE / 2;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, this.COVER_SIZE / 2, y);
        line = word + ' ';
        y += 200;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, this.COVER_SIZE / 2, y);

    // Subtitle (genre)
    ctx.font = 'bold 100px Arial';
    ctx.fillStyle = colors.secondary;
    ctx.fillText(template.genre.toUpperCase(), this.COVER_SIZE / 2, this.COVER_SIZE - 400);
  }

  /**
   * Draw genre/mood badges
   */
  private drawBadges(
    ctx: CanvasRenderingContext2D,
    template: BeatTemplate,
    colors: { bg: string; primary: string; secondary: string; accent: string }
  ): void {
    // Top badge (mood)
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(100, 100, 600, 120);
    
    ctx.fillStyle = colors.accent;
    ctx.font = 'bold 70px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(template.mood.toUpperCase(), 150, 180);

    // Bottom right badge (style)
    const styleText = template.style.toUpperCase();
    const styleWidth = ctx.measureText(styleText).width + 100;
    
    ctx.fillStyle = colors.secondary;
    ctx.fillRect(this.COVER_SIZE - styleWidth - 100, this.COVER_SIZE - 220, styleWidth, 120);
    
    ctx.fillStyle = colors.accent;
    ctx.textAlign = 'right';
    ctx.fillText(styleText, this.COVER_SIZE - 150, this.COVER_SIZE - 140);
  }

  /**
   * Get cover art path for a beat
   */
  getCoverArtPath(beatId: string): string {
    return path.join(this.OUTPUT_DIR, `${beatId}.png`);
  }

  /**
   * Check if cover art exists
   */
  coverArtExists(beatId: string): boolean {
    const filepath = this.getCoverArtPath(beatId);
    return fs.existsSync(filepath);
  }
}
