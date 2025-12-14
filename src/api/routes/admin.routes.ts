/**
 * Admin Routes
 * Admin-only endpoints for beat management, API keys, and system logs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateAdmin, requireSuperAdmin } from '../middleware/auth.middleware';
import { getPrismaClient } from '../../config/database.config';
import { loggingService } from '../../services/logging.service';
import { beatRepository } from '../../repositories/beat.repository';

const router = Router();
const prisma = getPrismaClient();

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * PATCH /api/admin/beats/:id
 * Update beat metadata
 */
router.patch('/beats/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      name,
      genre,
      style,
      mood,
      useCase,
      tags,
      description,
      bpm,
      musicalKey,
      pricing
    } = req.body;

    // Validate beat exists
    const existingBeat = await prisma.beat.findUnique({
      where: { id }
    });

    if (!existingBeat) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Beat with ID ${id} not found`
      });
    }

    // Validate tags if provided
    if (tags && (!Array.isArray(tags) || tags.length < 10 || tags.length > 15)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Tags must be an array with 10-15 items for BeatStars compliance'
      });
    }

    // Validate description length if provided
    if (description && description.length < 200) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Description must be at least 200 characters for BeatStars'
      });
    }

    // Validate BPM range if provided
    if (bpm && (bpm < 60 || bpm > 200)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'BPM must be between 60 and 200'
      });
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (genre !== undefined) updateData.genre = genre;
    if (style !== undefined) updateData.style = style;
    if (mood !== undefined) updateData.mood = mood;
    if (useCase !== undefined) updateData.useCase = useCase;
    if (tags !== undefined) updateData.tags = tags;
    if (description !== undefined) updateData.description = description;
    if (bpm !== undefined) updateData.bpm = bpm;
    if (musicalKey !== undefined) updateData.musicalKey = musicalKey;
    if (pricing !== undefined) updateData.pricing = pricing;

    // Update beat
    const updatedBeat = await prisma.beat.update({
      where: { id },
      data: updateData
    });

    loggingService.info('Beat updated by admin', {
      service: 'AdminRoutes',
      beatId: id,
      updatedFields: Object.keys(updateData),
      adminId: req.admin?.userId
    });

    res.json({
      success: true,
      message: 'Beat updated successfully',
      beat: updatedBeat
    });

  } catch (error) {
    if ((error as any).code === 'P2002') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Beat name already exists'
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/admin/beats/:id
 * Delete a beat and all its versions
 */
router.delete('/beats/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate beat exists
    const beat = await prisma.beat.findUnique({
      where: { id },
      include: { versions: true }
    });

    if (!beat) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Beat with ID ${id} not found`
      });
    }

    // Delete beat (cascade will delete versions)
    await prisma.beat.delete({
      where: { id }
    });

    loggingService.info('Beat deleted by admin', {
      service: 'AdminRoutes',
      beatId: id,
      beatName: beat.name,
      versionsDeleted: beat.versions.length,
      adminId: req.admin?.userId
    });

    res.json({
      success: true,
      message: 'Beat deleted successfully',
      deletedBeat: {
        id: beat.id,
        name: beat.name,
        versionsDeleted: beat.versions.length
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/keys
 * List all API keys with statistics
 */
router.get('/keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        status: true,
        quotaRemaining: true,
        lastUsed: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            beats: true,
            prompts: true
          }
        }
      }
    });

    res.json({
      success: true,
      total: apiKeys.length,
      data: apiKeys.map(key => ({
        ...key,
        beatsGenerated: key._count.beats,
        promptsUsed: key._count.prompts
      }))
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/keys
 * Add a new API key
 */
router.post('/keys', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, quotaRemaining = 500 } = req.body;

    if (!key || typeof key !== 'string') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Valid API key string is required'
      });
    }

    if (quotaRemaining < 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Quota must be >= 0'
      });
    }

    // Check if key already exists
    const existing = await prisma.apiKey.findUnique({
      where: { key }
    });

    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'This API key already exists'
      });
    }

    const newKey = await prisma.apiKey.create({
      data: {
        key,
        quotaRemaining,
        status: 'active'
      }
    });

    loggingService.info('API key added by admin', {
      service: 'AdminRoutes',
      keyId: newKey.id,
      quotaRemaining,
      adminId: req.admin?.userId
    });

    res.status(201).json({
      success: true,
      message: 'API key added successfully',
      key: newKey
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/keys/:id
 * Update API key quota or status
 */
router.patch('/keys/:id', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { quotaRemaining, status } = req.body;

    const updateData: any = {};
    if (quotaRemaining !== undefined) {
      if (quotaRemaining < 0) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Quota must be >= 0'
        });
      }
      updateData.quotaRemaining = quotaRemaining;
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'exhausted', 'error'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }
      updateData.status = status;
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: updateData
    });

    loggingService.info('API key updated by admin', {
      service: 'AdminRoutes',
      keyId: id,
      updatedFields: Object.keys(updateData),
      adminId: req.admin?.userId
    });

    res.json({
      success: true,
      message: 'API key updated successfully',
      key: updatedKey
    });

  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'API key not found'
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/admin/keys/:id
 * Delete an API key
 */
router.delete('/keys/:id', requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if key has been used
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            beats: true,
            prompts: true
          }
        }
      }
    });

    if (!apiKey) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'API key not found'
      });
    }

    // Prevent deletion if key has been used (data integrity)
    if (apiKey._count.beats > 0 || apiKey._count.prompts > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot delete API key that has been used. Set status to "error" instead.',
        usage: {
          beats: apiKey._count.beats,
          prompts: apiKey._count.prompts
        }
      });
    }

    await prisma.apiKey.delete({
      where: { id }
    });

    loggingService.info('API key deleted by admin', {
      service: 'AdminRoutes',
      keyId: id,
      adminId: req.admin?.userId
    });

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/logs
 * Get system execution logs with filtering
 */
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      level,
      service,
      startDate,
      endDate,
      page = 1,
      limit = 100
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 500);

    // Build filter
    const where: any = {};

    if (level) {
      where.level = level;
    }

    if (service) {
      where.service = service;
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

    const [logs, total] = await Promise.all([
      prisma.executionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.executionLog.count({ where })
    ]);

    res.json({
      success: true,
      data: logs,
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
 * GET /api/admin/stats/overview
 * Get comprehensive system statistics
 */
router.get('/stats/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalBeats,
      beatsToday,
      totalApiKeys,
      activeApiKeys,
      pendingBeats,
      completedBeats,
      failedBeats,
      totalVersions,
      genreDistribution,
      moodDistribution
    ] = await Promise.all([
      prisma.beat.count(),
      prisma.beat.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.apiKey.count(),
      prisma.apiKey.count({
        where: { status: 'active' }
      }),
      prisma.beat.count({
        where: { generationStatus: 'pending' }
      }),
      prisma.beat.count({
        where: { generationStatus: 'completed' }
      }),
      prisma.beat.count({
        where: { generationStatus: 'failed' }
      }),
      prisma.beatVersion.count(),
      prisma.beat.groupBy({
        by: ['genre'],
        _count: true,
        orderBy: {
          _count: {
            genre: 'desc'
          }
        },
        take: 10
      }),
      prisma.beat.groupBy({
        by: ['mood'],
        _count: true,
        orderBy: {
          _count: {
            mood: 'desc'
          }
        },
        take: 10
      })
    ]);

    res.json({
      success: true,
      stats: {
        beats: {
          total: totalBeats,
          today: beatsToday,
          pending: pendingBeats,
          completed: completedBeats,
          failed: failedBeats
        },
        apiKeys: {
          total: totalApiKeys,
          active: activeApiKeys,
          inactive: totalApiKeys - activeApiKeys
        },
        versions: {
          total: totalVersions,
          averagePerBeat: totalBeats > 0 ? (totalVersions / totalBeats).toFixed(2) : 0
        },
        distribution: {
          genres: genreDistribution.map(g => ({
            genre: g.genre,
            count: g._count
          })),
          moods: moodDistribution.map(m => ({
            mood: m.mood,
            count: m._count
          }))
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
