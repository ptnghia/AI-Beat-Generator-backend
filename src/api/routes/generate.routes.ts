import { Router, Request, Response, NextFunction } from 'express';
import { OrchestratorService } from '../../services/orchestrator.service';
import { beatRepository } from '../../repositories/beat.repository';
import { loggingService } from '../../services/logging.service';
import { getPrismaClient } from '../../config/database.config';

const router = Router();
const prisma = getPrismaClient();

/**
 * POST /api/generate/beats
 * Generate one or multiple beats with options
 * 
 * Body:
 * - templateId?: string (specific template, or random if not provided)
 * - count?: number (default: 1, max: 10)
 * - mode?: 'full' | 'metadata_only' (default: 'full')
 *   - 'full': Complete beat generation with audio files
 *   - 'metadata_only': Only create beat data, skip audio generation
 */
router.post('/beats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, count = 1, mode = 'full' } = req.body;

    // Validation
    if (count < 1 || count > 10) {
      return res.status(400).json({
        error: 'Invalid count',
        message: 'Count must be between 1 and 10'
      });
    }

    if (mode !== 'full' && mode !== 'metadata_only') {
      return res.status(400).json({
        error: 'Invalid mode',
        message: 'Mode must be either "full" or "metadata_only"'
      });
    }

    const results = [];
    const errors = [];

    loggingService.info('Manual beat generation requested', {
      service: 'GenerateAPI',
      templateId,
      count,
      mode
    });

    for (let i = 0; i < count; i++) {
      // Select template - make it required at function scope for TypeScript
      let selectedTemplateId: string;
      
      try {
        // Assign template ID
        if (templateId) {
          selectedTemplateId = templateId;
        } else {
          // Random template selection
          const templates = await prisma.beatTemplate.findMany({
            where: { isActive: true },
            take: 10
          });
          
          if (templates.length === 0) {
            throw new Error('No active templates available');
          }
          
          const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
          selectedTemplateId = randomTemplate.id;
        }

        // Verify template exists
        const template = await prisma.beatTemplate.findUnique({
          where: { id: selectedTemplateId }
        });

        if (!template) {
          errors.push({
            index: i,
            error: 'Template not found',
            templateId: selectedTemplateId
          });
          continue;
        }

        // Generate beat
        const orchestrator = new OrchestratorService();
        
        const beat = await orchestrator.generateBeat(selectedTemplateId, {
          skipAudio: mode === 'metadata_only'
        });

        results.push({
          index: i,
          beatId: beat.id,
          name: beat.name,
          templateId: selectedTemplateId,
          mode: mode,
          status: beat.generationStatus
        });

        loggingService.info('Beat generated successfully', {
          service: 'GenerateAPI',
          beatId: beat.id,
          mode
        });

      } catch (error) {
        loggingService.logError('GenerateAPI', error as Error, {
          context: 'generateBeat',
          index: i,
          templateId: selectedTemplateId
        });

        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          templateId: selectedTemplateId
        });
      }
    }

    res.json({
      success: errors.length === 0,
      requested: count,
      generated: results.length,
      failed: errors.length,
      mode,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/generate/beat
 * Generate a single beat (shorthand)
 * Same as POST /beats with count=1
 */
router.post('/beat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { templateId, mode = 'full' } = req.body;

    if (mode !== 'full' && mode !== 'metadata_only') {
      return res.status(400).json({
        error: 'Invalid mode',
        message: 'Mode must be either "full" or "metadata_only"'
      });
    }

    let selectedTemplateId = templateId;

    if (!selectedTemplateId) {
      // Random template selection
      const templates = await prisma.beatTemplate.findMany({
        where: { isActive: true },
        take: 10
      });

      if (templates.length === 0) {
        return res.status(400).json({
          error: 'No templates available',
          message: 'No active beat templates found'
        });
      }

      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      selectedTemplateId = randomTemplate.id;
    }

    // Verify template exists
    const template = await prisma.beatTemplate.findUnique({
      where: { id: selectedTemplateId }
    });

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        templateId: selectedTemplateId
      });
    }

    // Generate beat
    const orchestrator = new OrchestratorService();
    const beat = await orchestrator.generateBeat(selectedTemplateId, {
      skipAudio: mode === 'metadata_only'
    });

    loggingService.info('Beat generated successfully', {
      service: 'GenerateAPI',
      beatId: beat.id,
      mode
    });

    res.json({
      success: true,
      mode,
      beat: {
        id: beat.id,
        name: beat.name,
        genre: beat.genre,
        style: beat.style,
        mood: beat.mood,
        templateId: beat.templateId,
        generationStatus: beat.generationStatus,
        sunoAudioUrl: beat.sunoAudioUrl,
        sunoImageUrl: beat.sunoImageUrl,
        fileUrl: beat.fileUrl,
        createdAt: beat.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
