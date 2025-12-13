import * as fs from 'fs';
import * as path from 'path';
import { getPrismaClient } from '../config/database.config';
import { loggingService } from './logging.service';

const prisma = getPrismaClient();

export interface BeatStarsExportData {
  title: string;
  bpm: number;
  key: string;
  genre: string;
  mood: string;
  tags: string; // Comma-separated
  description: string;
  priceMp3Lease: number;
  priceWavLease: number;
  priceTrackout: number;
  priceExclusive: number;
  coverArtPath: string;
  mp3FilePath: string;
  wavFilePath: string;
  previewPath: string;
  createdAt: string;
}

export class BeatStarsExportService {
  /**
   * Export beats to CSV for BeatStars bulk upload
   */
  async exportToCSV(
    outputPath: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      genre?: string;
      hasWav?: boolean;
    }
  ): Promise<{ filePath: string; beatCount: number }> {
    const startTime = Date.now();

    try {
      loggingService.info('Starting BeatStars CSV export', {
        service: 'BeatStarsExportService',
        outputPath,
        filters
      });

      // Build query filters
      const whereClause: any = {
        generationStatus: 'completed'
      };

      if (filters?.startDate) {
        whereClause.createdAt = { gte: filters.startDate };
      }

      if (filters?.endDate) {
        whereClause.createdAt = { 
          ...whereClause.createdAt, 
          lte: filters.endDate 
        };
      }

      if (filters?.genre) {
        whereClause.genre = filters.genre;
      }

      if (filters?.hasWav) {
        whereClause.wavUrl = { not: null };
      }

      // Fetch beats from database
      const beats = await prisma.beat.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      if (beats.length === 0) {
        throw new Error('No beats found matching filters');
      }

      // Convert to BeatStars format
      const exportData: BeatStarsExportData[] = beats.map(beat => {
        const pricing = beat.pricing ? JSON.parse(JSON.stringify(beat.pricing)) : {};
        const tags = beat.tags ? JSON.parse(JSON.stringify(beat.tags)) : [];

        return {
          title: beat.name,
          bpm: this.extractBPM(beat.description),
          key: beat.musicalKey || 'C Minor',
          genre: beat.genre,
          mood: beat.mood,
          tags: Array.isArray(tags) ? tags.join(', ') : '',
          description: beat.description,
          priceMp3Lease: pricing.mp3Lease || 25,
          priceWavLease: pricing.wavLease || 49,
          priceTrackout: pricing.trackout || 99,
          priceExclusive: pricing.exclusive || 499,
          coverArtPath: beat.coverArtPath || '',
          mp3FilePath: beat.fileUrl,
          wavFilePath: beat.wavUrl || '',
          previewPath: beat.previewPath || '',
          createdAt: beat.createdAt.toISOString()
        };
      });

      // Generate CSV
      const csv = this.generateCSV(exportData);

      // Write to file
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, csv, 'utf-8');

      loggingService.info('BeatStars CSV export completed', {
        service: 'BeatStarsExportService',
        beatCount: beats.length,
        outputPath,
        duration: Date.now() - startTime
      });

      return {
        filePath: outputPath,
        beatCount: beats.length
      };

    } catch (error) {
      loggingService.logError('BeatStarsExportService', error as Error, {
        outputPath,
        filters
      });
      throw error;
    }
  }

  /**
   * Generate CSV string from data
   */
  private generateCSV(data: BeatStarsExportData[]): string {
    // CSV Headers
    const headers = [
      'Title',
      'BPM',
      'Key',
      'Genre',
      'Mood',
      'Tags',
      'Description',
      'Price_MP3_Lease',
      'Price_WAV_Lease',
      'Price_Trackout',
      'Price_Exclusive',
      'Cover_Art_Path',
      'MP3_File_Path',
      'WAV_File_Path',
      'Preview_Path',
      'Created_At'
    ].join(',');

    // CSV Rows
    const rows = data.map(beat => {
      return [
        this.escapeCSV(beat.title),
        beat.bpm,
        this.escapeCSV(beat.key),
        this.escapeCSV(beat.genre),
        this.escapeCSV(beat.mood),
        this.escapeCSV(beat.tags),
        this.escapeCSV(beat.description),
        beat.priceMp3Lease,
        beat.priceWavLease,
        beat.priceTrackout,
        beat.priceExclusive,
        this.escapeCSV(beat.coverArtPath),
        this.escapeCSV(beat.mp3FilePath),
        this.escapeCSV(beat.wavFilePath),
        this.escapeCSV(beat.previewPath),
        beat.createdAt
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (!value) return '';
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }

  /**
   * Extract BPM from description
   */
  private extractBPM(description: string): number {
    const match = description.match(/BPM:\s*(\d+)/i);
    return match ? parseInt(match[1]) : 120;
  }

  /**
   * Export single beat metadata
   */
  async exportBeatMetadata(beatId: string): Promise<BeatStarsExportData> {
    const beat = await prisma.beat.findUnique({
      where: { id: beatId }
    });

    if (!beat) {
      throw new Error(`Beat not found: ${beatId}`);
    }

    const pricing = beat.pricing ? JSON.parse(JSON.stringify(beat.pricing)) : {};
    const tags = beat.tags ? JSON.parse(JSON.stringify(beat.tags)) : [];

    return {
      title: beat.name,
      bpm: this.extractBPM(beat.description),
      key: beat.musicalKey || 'C Minor',
      genre: beat.genre,
      mood: beat.mood,
      tags: Array.isArray(tags) ? tags.join(', ') : '',
      description: beat.description,
      priceMp3Lease: pricing.mp3Lease || 25,
      priceWavLease: pricing.wavLease || 49,
      priceTrackout: pricing.trackout || 99,
      priceExclusive: pricing.exclusive || 499,
      coverArtPath: beat.coverArtPath || '',
      mp3FilePath: beat.fileUrl,
      wavFilePath: beat.wavUrl || '',
      previewPath: beat.previewPath || '',
      createdAt: beat.createdAt.toISOString()
    };
  }

  /**
   * Generate BeatStars-ready folder structure
   */
  async organizeBeatFiles(beatId: string, outputDir: string): Promise<void> {
    const metadata = await this.exportBeatMetadata(beatId);

    // Create folder structure
    const beatFolder = path.join(outputDir, metadata.title.replace(/[^a-z0-9]/gi, '_'));
    fs.mkdirSync(beatFolder, { recursive: true });

    // Copy files
    const files = [
      { src: metadata.mp3FilePath, dest: 'mp3' },
      { src: metadata.wavFilePath, dest: 'wav' },
      { src: metadata.previewPath, dest: 'preview' },
      { src: metadata.coverArtPath, dest: 'cover' }
    ];

    for (const file of files) {
      if (file.src && fs.existsSync(file.src)) {
        const ext = path.extname(file.src);
        const destPath = path.join(beatFolder, `${file.dest}${ext}`);
        fs.copyFileSync(file.src, destPath);
      }
    }

    // Save metadata as JSON
    const metadataPath = path.join(beatFolder, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    loggingService.info('Beat files organized for BeatStars', {
      service: 'BeatStarsExportService',
      beatId,
      outputDir: beatFolder
    });
  }

  /**
   * Generate upload checklist
   */
  generateUploadChecklist(metadata: BeatStarsExportData): string {
    const checklist = `
# BeatStars Upload Checklist

## Beat: ${metadata.title}

### Files Ready:
- [ ] MP3 (320kbps): ${metadata.mp3FilePath ? '✅' : '❌'}
- [ ] WAV (44.1kHz 16-bit): ${metadata.wavFilePath ? '✅' : '❌'}
- [ ] Preview (30s MP3): ${metadata.previewPath ? '✅' : '❌'}
- [ ] Cover Art (3000x3000px): ${metadata.coverArtPath ? '✅' : '❌'}

### Metadata Ready:
- [x] Title: ${metadata.title}
- [x] BPM: ${metadata.bpm}
- [x] Key: ${metadata.key}
- [x] Genre: ${metadata.genre}
- [x] Mood: ${metadata.mood}
- [x] Tags: ${metadata.tags.split(',').length} tags
- [x] Description: ${metadata.description.length} characters

### Pricing:
- [x] MP3 Lease: $${metadata.priceMp3Lease}
- [x] WAV Lease: $${metadata.priceWavLease}
- [x] Trackout: $${metadata.priceTrackout}
- [x] Exclusive: $${metadata.priceExclusive}

### Upload Steps:
1. Log in to BeatStars: https://www.beatstars.com
2. Go to My Media → Upload Beat
3. Upload MP3 file
4. Tick "Instrumental"
5. Fill in metadata (copy from above)
6. Upload cover art
7. Set pricing
8. Publish!

---
Generated: ${new Date().toISOString()}
`;

    return checklist;
  }
}

export const beatStarsExportService = new BeatStarsExportService();
