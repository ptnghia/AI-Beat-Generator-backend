import dotenv from 'dotenv';

dotenv.config();

export interface SchedulerConfig {
  beatGenerationInterval: string;
  beatCatalogPath: string;
  beatOutputDir: string;
}

export const schedulerConfig: SchedulerConfig = {
  beatGenerationInterval: process.env.BEAT_GENERATION_INTERVAL || '*/15 * * * *',
  beatCatalogPath: process.env.BEAT_CATALOG_PATH || './beat_catalog.xml',
  beatOutputDir: process.env.BEAT_OUTPUT_DIR || './output/beats'
};
