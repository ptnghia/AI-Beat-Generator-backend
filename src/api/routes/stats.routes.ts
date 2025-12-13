/**
 * Stats Routes
 * Handles system statistics endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { beatRepository } from '../../repositories/beat.repository';
import { PrismaClient } from '@prisma/client';
import { loggingService } from '../../services/logging.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/stats
 * Get system statistics
 * 
 * Returns:
 * - beats: Beat statistics (total, by genre, by mood, recent count)
 * - apiKeys: API key statistics (total, active, exhausted)
 * - system: System information (uptime, last beat generated, total beats today)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get beat statistics
    const beatStats = await beatRepository.getStats();

    // Get API key statistics
    const totalKeys = await prisma.apiKey.count();
    const activeKeys = await prisma.apiKey.count({
      where: {
        status: 'active'
      }
    });
    const exhaustedKeys = await prisma.apiKey.count({
      where: {
        status: 'exhausted'
      }
    });

    // Get system information
    const lastBeatGenerated = await beatRepository.getLastBeatGenerated();
    const totalBeatsToday = await beatRepository.getTotalBeatsToday();

    const stats = {
      beats: {
        total: beatStats.total,
        byGenre: beatStats.byGenre,
        byMood: beatStats.byMood,
        recentCount: beatStats.recentCount
      },
      apiKeys: {
        total: totalKeys,
        active: activeKeys,
        exhausted: exhaustedKeys
      },
      system: {
        uptime: `${Math.floor(process.uptime())}s`,
        lastBeatGenerated: lastBeatGenerated?.toISOString() || null,
        totalBeatsToday
      }
    };

    loggingService.info('System statistics retrieved', {
      service: 'StatsRoutes',
      totalBeats: beatStats.total,
      totalKeys,
      activeKeys
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export { router as statsRoutes };
