/**
 * Beat Repository
 * Handles database operations for beats
 */

import { PrismaClient, Beat } from '@prisma/client';
import { loggingService } from '../services/logging.service';

const prisma = new PrismaClient();

export interface BeatQueryParams {
  genre?: string;
  style?: string;
  mood?: string;
  useCase?: string;
  tags?: string[]; // Array of tags to filter by
  page?: number;
  limit?: number;
}

export interface BeatQueryResult {
  data: Beat[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class BeatRepository {
  /**
   * Query beats with filtering and pagination
   */
  async queryBeats(params: BeatQueryParams): Promise<BeatQueryResult> {
    try {
      const {
        genre,
        style,
        mood,
        useCase,
        tags,
        page = 1,
        limit = 20
      } = params;

      // Build where clause
      const where: any = {};

      if (genre) {
        where.genre = genre;
      }

      if (style) {
        where.style = style;
      }

      if (mood) {
        where.mood = mood;
      }

      if (useCase) {
        where.useCase = useCase;
      }

      // Filter by tags (if tags is JSON array in database)
      // Note: JSON filtering in Prisma is limited, we'll filter in memory after query
      // For now, we skip this filter at database level

      // Get total count
      const total = await prisma.beat.count({ where });

      // Calculate pagination
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      // Get beats
      let beats = await prisma.beat.findMany({
        where,
        skip,
        take: limit * 2, // Get more to filter by tags in memory
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Filter by tags in memory (since JSON filtering is limited in Prisma)
      if (tags && tags.length > 0) {
        beats = beats.filter(beat => {
          const beatTags = beat.tags as string[];
          return tags.some(tag => beatTags.includes(tag));
        });
        
        // Trim to limit
        beats = beats.slice(0, limit);
      }

      loggingService.info('Beats queried successfully', {
        service: 'BeatRepository',
        filters: { genre, style, mood, useCase, tags },
        page,
        limit,
        total,
        returned: beats.length
      });

      return {
        data: beats,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    } catch (error) {
      loggingService.logError('BeatRepository', error as Error, {
        context: 'queryBeats',
        params
      });
      throw error;
    }
  }

  /**
   * Get beat by ID
   */
  async getBeatById(id: string): Promise<Beat | null> {
    try {
      const beat = await prisma.beat.findUnique({
        where: { id }
      });

      if (beat) {
        loggingService.info('Beat retrieved successfully', {
          service: 'BeatRepository',
          beatId: id,
          beatName: beat.name
        });
      } else {
        loggingService.warn('Beat not found', {
          service: 'BeatRepository',
          beatId: id
        });
      }

      return beat;
    } catch (error) {
      loggingService.logError('BeatRepository', error as Error, {
        context: 'getBeatById',
        beatId: id
      });
      throw error;
    }
  }

  /**
   * Get beats statistics
   */
  async getStats(): Promise<{
    total: number;
    byGenre: Record<string, number>;
    byMood: Record<string, number>;
    recentCount: number;
  }> {
    try {
      // Total beats
      const total = await prisma.beat.count();

      // Beats by genre
      const genreGroups = await prisma.beat.groupBy({
        by: ['genre'],
        _count: true
      });

      const byGenre: Record<string, number> = {};
      genreGroups.forEach(group => {
        byGenre[group.genre] = group._count;
      });

      // Beats by mood
      const moodGroups = await prisma.beat.groupBy({
        by: ['mood'],
        _count: true
      });

      const byMood: Record<string, number> = {};
      moodGroups.forEach(group => {
        byMood[group.mood] = group._count;
      });

      // Recent beats (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentCount = await prisma.beat.count({
        where: {
          createdAt: {
            gte: yesterday
          }
        }
      });

      loggingService.info('Beat statistics retrieved', {
        service: 'BeatRepository',
        total,
        genreCount: Object.keys(byGenre).length,
        moodCount: Object.keys(byMood).length,
        recentCount
      });

      return {
        total,
        byGenre,
        byMood,
        recentCount
      };
    } catch (error) {
      loggingService.logError('BeatRepository', error as Error, {
        context: 'getStats'
      });
      throw error;
    }
  }

  /**
   * Get total beats created today
   */
  async getTotalBeatsToday(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const count = await prisma.beat.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      });

      return count;
    } catch (error) {
      loggingService.logError('BeatRepository', error as Error, {
        context: 'getTotalBeatsToday'
      });
      throw error;
    }
  }

  /**
   * Get last beat generated
   */
  async getLastBeatGenerated(): Promise<Date | null> {
    try {
      const lastBeat = await prisma.beat.findFirst({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          createdAt: true
        }
      });

      return lastBeat?.createdAt || null;
    } catch (error) {
      loggingService.logError('BeatRepository', error as Error, {
        context: 'getLastBeatGenerated'
      });
      throw error;
    }
  }

  /**
   * Update beat record
   */
  async updateBeat(id: string, data: Partial<Beat>): Promise<Beat> {
    try {
      const beat = await prisma.beat.update({
        where: { id },
        data
      });

      loggingService.info('Beat updated', {
        service: 'BeatRepository',
        beatId: id
      });

      return beat;
    } catch (error) {
      loggingService.logError('BeatRepository', error as Error, {
        context: 'updateBeat',
        beatId: id
      });
      throw error;
    }
  }
}

export const beatRepository = new BeatRepository();
