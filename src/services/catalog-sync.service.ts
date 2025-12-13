import { CatalogParser } from '../parsers/catalog-parser';
import { BeatTemplate } from '../types/beat.types';
import { getPrismaClient } from '../config/database.config';
import { loggingService } from './logging.service';
import * as chokidar from 'chokidar';
import { schedulerConfig } from '../config/scheduler.config';

export interface SyncResult {
  added: number;
  updated: number;
  unchanged: number;
  errors: string[];
}

export class CatalogSyncService {
  private parser: CatalogParser;
  private prisma = getPrismaClient();
  private watcher?: chokidar.FSWatcher;

  constructor() {
    this.parser = new CatalogParser();
  }

  /**
   * Load catalog on system startup
   */
  async loadCatalogOnStartup(): Promise<void> {
    try {
      loggingService.info('Loading beat catalog on startup', {
        service: 'CatalogSyncService'
      });

      const templates = await this.parser.parseXML(schedulerConfig.beatCatalogPath);
      const result = await this.syncCatalogToDatabase(templates);

      loggingService.info('Catalog loaded successfully', {
        service: 'CatalogSyncService',
        result
      });

      // Start watching for file changes
      this.watchForChanges();
    } catch (error) {
      loggingService.logError('CatalogSyncService', error as Error, {
        context: 'loadCatalogOnStartup'
      });
      throw error;
    }
  }

  /**
   * Sync catalog templates to database
   */
  async syncCatalogToDatabase(templates: BeatTemplate[]): Promise<SyncResult> {
    const result: SyncResult = {
      added: 0,
      updated: 0,
      unchanged: 0,
      errors: []
    };

    try {
      // Use transaction for atomicity
      await this.prisma.$transaction(async (tx) => {
        // Get all existing templates
        const existingTemplates = await tx.beatTemplate.findMany({
          select: { id: true, xmlChecksum: true }
        });

        const existingIds = new Set(existingTemplates.map(t => t.id));
        const existingChecksums = new Map(
          existingTemplates.map(t => [t.id, t.xmlChecksum])
        );

        const templateIds = new Set<string>();

        // Process each template
        for (const template of templates) {
          try {
            templateIds.add(template.id);

            if (!existingIds.has(template.id)) {
              // Insert new template
              await tx.beatTemplate.create({
                data: {
                  id: template.id,
                  categoryName: template.categoryName,
                  genre: template.genre,
                  style: template.style,
                  mood: template.mood,
                  useCase: template.useCase,
                  tags: template.tags,
                  basePrompt: template.basePrompt,
                  isActive: true,
                  xmlChecksum: template.xmlChecksum
                }
              });
              result.added++;
            } else {
              // Check if template changed
              const existingChecksum = existingChecksums.get(template.id);
              if (existingChecksum !== template.xmlChecksum) {
                // Update existing template
                await tx.beatTemplate.update({
                  where: { id: template.id },
                  data: {
                    categoryName: template.categoryName,
                    genre: template.genre,
                    style: template.style,
                    mood: template.mood,
                    useCase: template.useCase,
                    tags: template.tags,
                    basePrompt: template.basePrompt,
                    isActive: true,
                    xmlChecksum: template.xmlChecksum
                  }
                });
                result.updated++;
              } else {
                result.unchanged++;
              }
            }
          } catch (error) {
            const errorMsg = `Failed to sync template ${template.id}: ${error}`;
            result.errors.push(errorMsg);
            loggingService.error(errorMsg, { service: 'CatalogSyncService' });
          }
        }

        // Mark templates not in XML as inactive (soft delete)
        const templatesToDeactivate = Array.from(existingIds).filter(
          id => !templateIds.has(id)
        );

        if (templatesToDeactivate.length > 0) {
          await tx.beatTemplate.updateMany({
            where: { id: { in: templatesToDeactivate } },
            data: { isActive: false }
          });
          loggingService.info('Deactivated removed templates', {
            service: 'CatalogSyncService',
            count: templatesToDeactivate.length
          });
        }
      });

      loggingService.info('Catalog sync completed', {
        service: 'CatalogSyncService',
        result
      });

      return result;
    } catch (error) {
      loggingService.logError('CatalogSyncService', error as Error, {
        context: 'syncCatalogToDatabase'
      });
      throw error;
    }
  }

  /**
   * Handle catalog update when file changes
   */
  async handleCatalogUpdate(templates: BeatTemplate[]): Promise<void> {
    try {
      loggingService.info('Handling catalog update', {
        service: 'CatalogSyncService',
        templatesCount: templates.length
      });

      const result = await this.syncCatalogToDatabase(templates);

      loggingService.info('Catalog update completed', {
        service: 'CatalogSyncService',
        result
      });
    } catch (error) {
      loggingService.logError('CatalogSyncService', error as Error, {
        context: 'handleCatalogUpdate'
      });
      // Don't throw - keep existing data on error
    }
  }

  /**
   * Watch for catalog file changes
   */
  private watchForChanges(): void {
    try {
      this.watcher = chokidar.watch(schedulerConfig.beatCatalogPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      });

      this.watcher.on('change', async (path) => {
        loggingService.info('Catalog file changed, reloading...', {
          service: 'CatalogSyncService',
          path
        });

        try {
          const templates = await this.parser.parseXML(path);
          await this.handleCatalogUpdate(templates);
        } catch (error) {
          loggingService.logError('CatalogSyncService', error as Error, {
            context: 'watchForChanges',
            path
          });
        }
      });

      loggingService.info('File watcher started', {
        service: 'CatalogSyncService',
        path: schedulerConfig.beatCatalogPath
      });
    } catch (error) {
      loggingService.logError('CatalogSyncService', error as Error, {
        context: 'watchForChanges'
      });
    }
  }

  /**
   * Stop watching for file changes
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      loggingService.info('File watcher stopped', {
        service: 'CatalogSyncService'
      });
    }
  }
}
