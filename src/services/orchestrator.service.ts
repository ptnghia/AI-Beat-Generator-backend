import * as fs from 'fs';
import { Beat, BeatTemplate } from '../types/beat.types';
import { getPrismaClient } from '../config/database.config';
import { loggingService } from './logging.service';
import { ApiKeyManager } from './apikey-manager.service';
import { ConceptService } from './concept.service';
import { PromptService } from './prompt.service';
import { MusicService } from './music.service';
import { MetadataService } from './metadata.service';
import { CoverArtService } from './cover-art.service';
import { BPMDetectionService } from './bpm-detection.service';
import { KeyDetectionService } from './key-detection.service';
import { TagGeneratorService } from './tag-generator.service';
import { PreviewGeneratorService } from './preview-generator.service';
import { PricingService } from './pricing.service';

export class OrchestratorService {
  private prisma = getPrismaClient();
  private apiKeyManager: ApiKeyManager;
  private conceptService: ConceptService;
  private promptService: PromptService;
  private musicService: MusicService;
  private metadataService: MetadataService;
  private coverArtService: CoverArtService;
  private bpmDetectionService: BPMDetectionService;
  private keyDetectionService: KeyDetectionService;
  private tagGeneratorService: TagGeneratorService;
  private previewGeneratorService: PreviewGeneratorService;
  private pricingService: PricingService;

  constructor() {
    this.apiKeyManager = new ApiKeyManager();
    this.conceptService = new ConceptService();
    this.promptService = new PromptService();
    this.musicService = new MusicService();
    this.metadataService = new MetadataService();
    this.coverArtService = new CoverArtService();
    this.bpmDetectionService = new BPMDetectionService();
    this.keyDetectionService = new KeyDetectionService();
    this.tagGeneratorService = new TagGeneratorService();
    this.previewGeneratorService = new PreviewGeneratorService();
    this.pricingService = new PricingService();
  }

  /**
   * Generate a complete beat through the full workflow
   * @param templateId Optional template ID to use (if not provided, will select automatically)
   * @param options Generation options
   */
  async generateBeat(templateId?: string, options?: {
    skipAudio?: boolean;  // If true, only create metadata, skip Suno API
  }): Promise<Beat> {
    const startTime = Date.now();
    const skipAudio = options?.skipAudio || false;

    try {
      loggingService.info('Starting beat generation workflow', {
        service: 'OrchestratorService',
        templateId: templateId || 'auto-select'
      });

      // Step 1: Select beat template (avoid recently used)
      let template;
      if (templateId) {
        template = await this.prisma.beatTemplate.findUnique({
          where: { id: templateId }
        });
        if (!template) {
          throw new Error(`Template not found: ${templateId}`);
        }
      } else {
        template = await this.selectTemplate();
        if (!template) {
          throw new Error('No available beat templates');
        }
      }

      loggingService.info('Template selected', {
        service: 'OrchestratorService',
        templateId: template.id,
        categoryName: template.categoryName
      });

      // Step 2: Get API key
      const apiKey = await this.apiKeyManager.getNextAvailableKey();
      if (!apiKey) {
        throw new Error('No active API keys available');
      }

      loggingService.info('API key selected', {
        service: 'OrchestratorService',
        keyId: apiKey.id
      });

      // Convert Prisma template to BeatTemplate type
      const beatTemplate: BeatTemplate = {
        id: template.id,
        categoryName: template.categoryName,
        genre: template.genre,
        style: template.style,
        mood: template.mood,
        useCase: template.useCase,
        tags: Array.isArray(template.tags) ? template.tags as string[] : [],
        basePrompt: template.basePrompt,
        isActive: template.isActive,
        xmlChecksum: template.xmlChecksum || undefined
      };

      // Step 3: Generate concept
      const conceptData = await this.conceptService.generateConcept(beatTemplate);

      // Step 4: Optimize prompts for both Suno and BeatStars
      const promptOptimization = await this.promptService.optimizePrompt({
        genre: beatTemplate.genre,
        style: beatTemplate.style,
        mood: beatTemplate.mood,
        concept: conceptData,
        basePrompt: beatTemplate.basePrompt
      });

      loggingService.info('Prompts optimized', {
        service: 'OrchestratorService',
        sunoPromptLength: promptOptimization.sunoPrompt.length,
        beatstarsTitle: promptOptimization.beatstarsTitle,
        skipAudio
      });

      // Initialize variables
      let jobId: string | undefined;
      let fileUrl: string | undefined;
      let audioId: string | undefined;
      let alternateFileUrl: string | undefined;
      let alternateAudioId: string | undefined;
      let localFilePath: string | undefined;
      let alternateLocalFilePath: string | undefined;
      let previewPath: string | undefined;
      let bpmData = { bpm: 120, confidence: 0.5, method: 'estimated' };
      let keyData = { key: 'C Major', confidence: 0.5, method: 'estimated', keyLetter: 'C', mode: 'Major' };

      // Step 5: Generate music (conditional based on skipAudio)
      if (!skipAudio) {
        const musicResult = await this.musicService.generateMusic(
          promptOptimization.sunoPrompt,
          apiKey.key
        );
        jobId = musicResult.jobId;
        fileUrl = musicResult.fileUrl;
        audioId = musicResult.audioId;
        alternateFileUrl = musicResult.alternateFileUrl;
        alternateAudioId = musicResult.alternateAudioId;

        // Step 5.5: Download and save both files locally
        localFilePath = fileUrl;
      
        try {
          if (fileUrl && fileUrl.startsWith('http')) {
            localFilePath = await this.musicService.downloadAndSaveFile(fileUrl, jobId);
            loggingService.info('Primary audio file saved locally', {
              service: 'OrchestratorService',
              localPath: localFilePath
            });
          }
          
          // Download second track if available
          if (alternateFileUrl && alternateFileUrl.startsWith('http')) {
            alternateLocalFilePath = await this.musicService.downloadAndSaveFile(
              alternateFileUrl, 
              `${jobId}_alt`
            );
            loggingService.info('Alternate audio file saved locally', {
              service: 'OrchestratorService',
              localPath: alternateLocalFilePath
            });
          }
        } catch (error) {
          loggingService.error('Failed to download audio file, using remote URL', {
            service: 'OrchestratorService',
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue with remote URL if download fails
        }

        // Step 6: Detect BPM from generated audio
        try {
          if (localFilePath && fs.existsSync(localFilePath)) {
            bpmData = await this.bpmDetectionService.detectBPM(localFilePath);
            loggingService.info('BPM detected', {
              service: 'OrchestratorService',
              bpm: bpmData.bpm,
              method: bpmData.method
            });
          }
        } catch (error) {
          loggingService.warn('BPM detection failed, using estimate', {
            service: 'OrchestratorService',
            error: error instanceof Error ? error.message : String(error)
          });
        }

        // Step 7: Detect musical key
        try {
          keyData = await this.keyDetectionService.detectKey({
            genre: beatTemplate.genre,
            mood: beatTemplate.mood,
            style: beatTemplate.style
          });
          loggingService.info('Key detected', {
            service: 'OrchestratorService',
            key: keyData.key,
            method: keyData.method
          });
        } catch (error) {
          loggingService.warn('Key detection failed, using default', {
            service: 'OrchestratorService',
            error: error instanceof Error ? error.message : String(error)
          });
        }

        // Step 8: Generate preview clip (30 seconds)
        try {
          if (localFilePath && fs.existsSync(localFilePath)) {
            const previewResult = await this.previewGeneratorService.generatePreview(
              localFilePath,
              './output/previews',
              jobId
            );
            if (previewResult.success && previewResult.previewPath) {
              previewPath = previewResult.previewPath;
              loggingService.info('Preview generated', {
                service: 'OrchestratorService',
                previewPath,
                duration: previewResult.duration
              });
            }
          }
        } catch (error) {
          loggingService.warn('Preview generation failed, continuing without it', {
            service: 'OrchestratorService',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } // End of if (!skipAudio)

      // Step 9: Generate metadata
      const metadata = await this.metadataService.generateMetadata(beatTemplate, promptOptimization.sunoPrompt);

      // Step 10: Use BeatStars-optimized title as name
      const uniqueName = await this.ensureUniqueName(promptOptimization.beatstarsTitle, beatTemplate);

      // Step 11: Generate BeatStars SEO tags
      let beatstarsTags: string[] = [];
      try {
        const tagResult = await this.tagGeneratorService.generateTags({
          genre: beatTemplate.genre,
          style: beatTemplate.style,
          mood: beatTemplate.mood,
          bpm: bpmData.bpm,
          key: keyData.key
        });
        beatstarsTags = tagResult.tags;
        loggingService.info('Tags generated', {
          service: 'OrchestratorService',
          tagCount: beatstarsTags.length,
          primaryTags: tagResult.primaryTags.join(', ')
        });
      } catch (error) {
        loggingService.warn('Tag generation failed, using fallback', {
          service: 'OrchestratorService',
          error: error instanceof Error ? error.message : String(error)
        });
        // Use template tags as fallback
        beatstarsTags = beatTemplate.tags;
      }

      // Step 12: Generate cover art (3000x3000px for BeatStars)
      const tempBeatId = `temp-${Date.now()}`;
      let coverArtPath: string | undefined;
      
      try {
        coverArtPath = await this.coverArtService.generateCoverArt(
          uniqueName,
          beatTemplate,
          tempBeatId
        );
        
        loggingService.info('Cover art generated', {
          service: 'OrchestratorService',
          coverArtPath
        });
      } catch (error) {
        loggingService.error('Failed to generate cover art, continuing without it', {
          service: 'OrchestratorService',
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Step 13: Store complete beat record with all metadata
      const beat = await this.storeBeat({
        template: beatTemplate,
        name: uniqueName,
        conceptData,
        normalizedPrompt: promptOptimization.sunoPrompt,
        metadata,
        fileUrl: localFilePath || '',
        apiKeyId: apiKey.id,
        additionalTags: promptOptimization.additionalTags,
        coverArtPath,
        sunoTaskId: jobId,
        sunoAudioId: audioId,
        alternateFileUrl: alternateLocalFilePath || null,
        alternateAudioId: alternateAudioId || null,
        bpm: bpmData.bpm,
        musicalKey: keyData.key,
        beatstarsTags,
        beatstarsTitle: promptOptimization.beatstarsTitle,
        beatstarsDescription: promptOptimization.beatstarsDescription,
        previewPath
      });

      // Step 14: Update template last used
      await this.prisma.beatTemplate.update({
        where: { id: template.id },
        data: { lastUsed: new Date() }
      });

      const executionTime = Date.now() - startTime;
      loggingService.info('Beat generation completed', {
        service: 'OrchestratorService',
        beatId: beat.id,
        beatName: beat.name,
        executionTime
      });

      return beat;
    } catch (error) {
      loggingService.logError('OrchestratorService', error as Error, {
        context: 'generateBeat'
      });
      throw error;
    }
  }

  /**
   * Select a beat template that hasn't been used in the last 24 hours
   */
  private async selectTemplate(): Promise<BeatTemplate | null> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Try to find templates not used in last 24 hours
      const availableTemplates = await this.prisma.beatTemplate.findMany({
        where: {
          isActive: true,
          OR: [
            { lastUsed: null },
            { lastUsed: { lt: twentyFourHoursAgo } }
          ]
        }
      });

      // If no templates available, reset and use any active template
      if (availableTemplates.length === 0) {
        loggingService.info('All templates used in last 24h, selecting from all active templates', {
          service: 'OrchestratorService'
        });

        const allTemplates = await this.prisma.beatTemplate.findMany({
          where: { isActive: true }
        });

        if (allTemplates.length === 0) {
          return null;
        }

        // Random selection
        const randomIndex = Math.floor(Math.random() * allTemplates.length);
        return this.mapToTemplate(allTemplates[randomIndex]);
      }

      // Random selection from available templates
      const randomIndex = Math.floor(Math.random() * availableTemplates.length);
      return this.mapToTemplate(availableTemplates[randomIndex]);
    } catch (error) {
      loggingService.logError('OrchestratorService', error as Error, {
        context: 'selectTemplate'
      });
      throw error;
    }
  }

  /**
   * Ensure beat name is unique
   * Try to regenerate with different pattern before adding suffix
   */
  private async ensureUniqueName(baseName: string, template?: BeatTemplate, maxRetries: number = 3): Promise<string> {
    // First, check if base name is unique
    const existing = await this.prisma.beat.findUnique({
      where: { name: baseName }
    });

    if (!existing) {
      return baseName;
    }

    // If template provided, try regenerating with different patterns
    if (template && maxRetries > 0) {
      loggingService.info('Beat name already exists, regenerating', {
        service: 'OrchestratorService',
        existingName: baseName,
        retriesLeft: maxRetries
      });

      const newMetadata = await this.metadataService.generateMetadata(template, template.basePrompt);
      return this.ensureUniqueName(newMetadata.name, template, maxRetries - 1);
    }

    // Fallback: add numeric suffix
    let name = baseName;
    let suffix = 2;

    while (true) {
      name = `${baseName} ${suffix}`;
      
      const existing = await this.prisma.beat.findUnique({
        where: { name }
      });

      if (!existing) {
        loggingService.info('Added suffix to ensure uniqueness', {
          service: 'OrchestratorService',
          originalName: baseName,
          finalName: name
        });
        return name;
      }

      suffix++;
      
      // Safety limit
      if (suffix > 100) {
        throw new Error(`Could not generate unique name after 100 attempts for: ${baseName}`);
      }
    }
  }

  /**
   * Store complete beat record in database
   */
  private async storeBeat(data: {
    template: BeatTemplate;
    name: string;
    conceptData: any;
    normalizedPrompt: string;
    metadata: any;
    fileUrl: string;
    apiKeyId: string;
    additionalTags: string[];
    coverArtPath?: string;
    sunoTaskId?: string;
    sunoAudioId?: string;
    alternateFileUrl?: string;
    alternateAudioId?: string;
    bpm?: number;
    musicalKey?: string;
    beatstarsTags?: string[];
    beatstarsTitle?: string;
    beatstarsDescription?: string;
    previewPath?: string;
  }): Promise<Beat> {
    try {
      // Use BeatStars tags if available, otherwise fall back to template tags
      const allTags = data.beatstarsTags && data.beatstarsTags.length > 0
        ? data.beatstarsTags
        : [
            ...data.template.tags,
            ...data.metadata.tags,
            ...data.additionalTags
          ];

      // Remove duplicates and AI-related tags (BeatStars optimization)
      const uniqueTags = Array.from(new Set(allTags));
      const cleanTags = uniqueTags.filter(tag => 
        !tag.toLowerCase().includes('ai-generated') &&
        !tag.toLowerCase().includes('ai generated') &&
        !tag.toLowerCase().includes('enhanced') &&
        !tag.toLowerCase().includes('normalized') &&
        tag.length > 0
      );

      // Limit to 15 tags max (BeatStars recommendation)
      const finalTags = cleanTags.slice(0, 15);

      // Use BeatStars description if available
      const description = data.beatstarsDescription || data.metadata.description;

      const beat = await this.prisma.beat.create({
        data: {
          templateId: data.template.id,
          name: data.name,
          genre: data.template.genre,
          style: data.template.style,
          mood: data.template.mood,
          useCase: data.template.useCase,
          tags: finalTags,
          description: description,
          fileUrl: data.fileUrl,
          basePrompt: data.template.basePrompt,
          normalizedPrompt: data.normalizedPrompt,
          conceptData: data.conceptData,
          apiKeyUsed: data.apiKeyId,
          bpm: data.bpm || null,
          musicalKey: data.musicalKey || data.metadata.key,
          coverArtPath: data.coverArtPath,
          previewPath: data.previewPath || null,
          sunoTaskId: data.sunoTaskId,
          sunoAudioId: data.sunoAudioId,
          alternateFileUrl: data.alternateFileUrl,
          alternateAudioId: data.alternateAudioId,
          wavConversionStatus: 'not_started',
          generationStatus: data.fileUrl ? 'completed' : 'pending',
          filesUploaded: false
        }
      });

      return {
        id: beat.id,
        templateId: beat.templateId,
        name: beat.name,
        genre: beat.genre,
        style: beat.style,
        mood: beat.mood,
        useCase: beat.useCase,
        tags: beat.tags as string[],
        description: beat.description,
        fileUrl: beat.fileUrl,
        basePrompt: beat.basePrompt,
        normalizedPrompt: beat.normalizedPrompt,
        conceptData: beat.conceptData as any,
        apiKeyUsed: beat.apiKeyUsed,
        musicalKey: beat.musicalKey || undefined,
        coverArtPath: beat.coverArtPath || undefined,
        createdAt: beat.createdAt
      };
    } catch (error) {
      loggingService.logError('OrchestratorService', error as Error, {
        context: 'storeBeat'
      });
      throw error;
    }
  }

  /**
   * Map Prisma result to BeatTemplate
   */
  private mapToTemplate(data: any): BeatTemplate {
    return {
      id: data.id,
      categoryName: data.categoryName,
      genre: data.genre,
      style: data.style,
      mood: data.mood,
      useCase: data.useCase,
      tags: data.tags as string[],
      basePrompt: data.basePrompt,
      isActive: data.isActive,
      lastUsed: data.lastUsed,
      xmlChecksum: data.xmlChecksum
    };
  }

  /**
   * Check if a beat generation job is currently running
   */
  async isJobRunning(): Promise<boolean> {
    // In a real implementation, this would check for running jobs
    // For now, we'll use a simple approach
    return false;
  }
}
