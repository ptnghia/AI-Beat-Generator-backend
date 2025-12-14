/**
 * BeatStars Export Routes
 * Endpoints for exporting beat data to BeatStars-compatible formats
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateAdmin } from '../middleware/auth.middleware';
import { getPrismaClient } from '../../config/database.config';
import { loggingService } from '../../services/logging.service';

const router = Router();
const prisma = getPrismaClient();

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/beatstars/export
 * Export beats to CSV format for BeatStars upload
 */
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      startDate,
      endDate,
      genre,
      readyOnly = 'true'
    } = req.query;

    // Build filter
    const where: any = {};

    // Filter by ready status (has WAV + cover + all metadata)
    if (readyOnly === 'true') {
      where.AND = [
        { wavUrl: { not: null } },
        { coverArtPath: { not: null } },
        { generationStatus: 'completed' },
        { wavConversionStatus: 'completed' }
      ];
    }

    if (genre) {
      where.genre = genre;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const beats = await prisma.beat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        genre: true,
        style: true,
        mood: true,
        useCase: true,
        tags: true,
        description: true,
        bpm: true,
        musicalKey: true,
        fileUrl: true,
        wavUrl: true,
        coverArtPath: true,
        pricing: true,
        createdAt: true
      }
    });

    // Generate CSV content
    const csvHeaders = [
      'Title',
      'BPM',
      'Musical Key',
      'Genre',
      'Style',
      'Mood',
      'Use Case',
      'Tags',
      'Description',
      'MP3 Path',
      'WAV Path',
      'Cover Path',
      'Price MP3 Lease',
      'Price WAV Lease',
      'Price Trackout',
      'Price Exclusive',
      'Created Date'
    ];

    const csvRows = beats.map(beat => {
      const tags = Array.isArray(beat.tags) ? beat.tags.join(', ') : '';
      const pricing = beat.pricing as any || {};
      
      return [
        beat.name,
        beat.bpm || '',
        beat.musicalKey || '',
        beat.genre,
        beat.style,
        beat.mood,
        beat.useCase,
        tags,
        `"${(beat.description || '').replace(/"/g, '""')}"`, // Escape quotes
        beat.fileUrl || '',
        beat.wavUrl || '',
        beat.coverArtPath || '',
        pricing.mp3Lease || 25,
        pricing.wavLease || 49,
        pricing.trackout || 99,
        pricing.exclusive || 499,
        beat.createdAt.toISOString().split('T')[0]
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    loggingService.info('BeatStars CSV export generated', {
      service: 'BeatStarsExport',
      beatsCount: beats.length,
      adminId: req.admin?.userId
    });

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="beatstars_export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/beatstars/ready-check
 * Check which beats are ready for BeatStars upload
 */
router.get('/ready-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);

    const [beats, total] = await Promise.all([
      prisma.beat.findMany({
        where: {
          generationStatus: 'completed'
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          name: true,
          genre: true,
          mood: true,
          bpm: true,
          musicalKey: true,
          tags: true,
          description: true,
          fileUrl: true,
          wavUrl: true,
          coverArtPath: true,
          wavConversionStatus: true,
          pricing: true,
          createdAt: true
        }
      }),
      prisma.beat.count({
        where: {
          generationStatus: 'completed'
        }
      })
    ]);

    // Analyze readiness for each beat
    const analyzedBeats = beats.map(beat => {
      const tags = Array.isArray(beat.tags) ? beat.tags : [];
      const hasValidTags = tags.length >= 10 && tags.length <= 15;
      const hasValidDescription = beat.description && beat.description.length >= 200;
      const hasWav = beat.wavUrl && beat.wavConversionStatus === 'completed';
      const hasCover = !!beat.coverArtPath;
      const hasMP3 = !!beat.fileUrl;
      const hasBPM = !!beat.bpm;
      const hasKey = !!beat.musicalKey;
      const hasPricing = !!beat.pricing;

      const isReady = hasValidTags && hasValidDescription && hasWav && 
                      hasCover && hasMP3 && hasBPM && hasKey && hasPricing;

      const missingItems: string[] = [];
      if (!hasMP3) missingItems.push('MP3 file');
      if (!hasWav) missingItems.push('WAV file');
      if (!hasCover) missingItems.push('Cover art');
      if (!hasBPM) missingItems.push('BPM');
      if (!hasKey) missingItems.push('Musical key');
      if (!hasValidTags) missingItems.push(`Valid tags (${tags.length}/10-15)`);
      if (!hasValidDescription) missingItems.push('Description (min 200 chars)');
      if (!hasPricing) missingItems.push('Pricing');

      return {
        id: beat.id,
        name: beat.name,
        genre: beat.genre,
        mood: beat.mood,
        isReady,
        readiness: {
          hasMP3,
          hasWav,
          hasCover,
          hasBPM,
          hasKey,
          hasValidTags,
          hasValidDescription,
          hasPricing
        },
        missingItems,
        metadata: {
          bpm: beat.bpm,
          musicalKey: beat.musicalKey,
          tagsCount: tags.length,
          descriptionLength: beat.description?.length || 0
        },
        createdAt: beat.createdAt
      };
    });

    // Summary statistics
    const readyCount = analyzedBeats.filter(b => b.isReady).length;
    const missingWav = analyzedBeats.filter(b => !b.readiness.hasWav).length;
    const missingCover = analyzedBeats.filter(b => !b.readiness.hasCover).length;
    const missingTags = analyzedBeats.filter(b => !b.readiness.hasValidTags).length;

    res.json({
      success: true,
      summary: {
        total,
        ready: readyCount,
        notReady: total - readyCount,
        missingWav,
        missingCover,
        missingTags
      },
      data: analyzedBeats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/beatstars/checklist/:id
 * Get BeatStars upload checklist for a specific beat
 */
router.get('/checklist/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const beat = await prisma.beat.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        genre: true,
        style: true,
        mood: true,
        useCase: true,
        tags: true,
        description: true,
        bpm: true,
        musicalKey: true,
        fileUrl: true,
        wavUrl: true,
        coverArtPath: true,
        wavConversionStatus: true,
        pricing: true,
        duration: true,
        modelName: true
      }
    });

    if (!beat) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Beat not found'
      });
    }

    const tags = Array.isArray(beat.tags) ? beat.tags : [];
    const pricing = beat.pricing as any || {};

    // BeatStars Upload Checklist
    const checklist = {
      beatId: beat.id,
      beatName: beat.name,
      items: [
        {
          item: 'Audio Files',
          status: beat.fileUrl && beat.wavUrl ? 'complete' : 'incomplete',
          details: {
            mp3: beat.fileUrl ? '✅ Available' : '❌ Missing',
            wav: beat.wavUrl ? '✅ Available' : '❌ Missing',
            wavStatus: beat.wavConversionStatus
          }
        },
        {
          item: 'Title Formula',
          status: beat.name ? 'complete' : 'incomplete',
          details: {
            title: beat.name,
            length: beat.name?.length || 0
          }
        },
        {
          item: 'BPM & Key',
          status: beat.bpm && beat.musicalKey ? 'complete' : 'incomplete',
          details: {
            bpm: beat.bpm || '❌ Not detected',
            musicalKey: beat.musicalKey || '❌ Not detected'
          }
        },
        {
          item: 'Tags (10-15 required)',
          status: tags.length >= 10 && tags.length <= 15 ? 'complete' : 'incomplete',
          details: {
            count: tags.length,
            tags: tags,
            valid: tags.length >= 10 && tags.length <= 15
          }
        },
        {
          item: 'Description',
          status: beat.description && beat.description.length >= 200 ? 'complete' : 'incomplete',
          details: {
            length: beat.description?.length || 0,
            minRequired: 200,
            preview: beat.description?.substring(0, 100) + '...'
          }
        },
        {
          item: 'License Pricing',
          status: pricing.mp3Lease && pricing.wavLease ? 'complete' : 'incomplete',
          details: {
            mp3Lease: pricing.mp3Lease || 'Not set',
            wavLease: pricing.wavLease || 'Not set',
            trackout: pricing.trackout || 'Not set',
            exclusive: pricing.exclusive || 'Not set'
          }
        },
        {
          item: 'Cover Art',
          status: beat.coverArtPath ? 'complete' : 'incomplete',
          details: {
            path: beat.coverArtPath || '❌ Not generated',
            requiredSize: '3000x3000px'
          }
        }
      ],
      metadata: {
        genre: beat.genre,
        style: beat.style,
        mood: beat.mood,
        useCase: beat.useCase,
        duration: beat.duration,
        model: beat.modelName
      }
    };

    const totalItems = checklist.items.length;
    const completedItems = checklist.items.filter(i => i.status === 'complete').length;
    const readyForUpload = completedItems === totalItems;

    res.json({
      success: true,
      readyForUpload,
      progress: {
        completed: completedItems,
        total: totalItems,
        percentage: Math.round((completedItems / totalItems) * 100)
      },
      checklist
    });

  } catch (error) {
    next(error);
  }
});

export default router;
