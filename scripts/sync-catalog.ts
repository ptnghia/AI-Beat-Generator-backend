#!/usr/bin/env ts-node

import { connectDatabase, disconnectDatabase } from '../src/config/database.config';
import { CatalogSyncService } from '../src/services/catalog-sync.service';
import { loggingService } from '../src/services/logging.service';

async function syncCatalog() {
  try {
    console.log('📚 Starting Catalog Sync...\n');

    await connectDatabase();
    console.log('✅ Database connected\n');

    const catalogService = new CatalogSyncService();
    await catalogService.loadCatalogOnStartup();

    console.log('\n✅ Catalog sync completed!');
    
    await disconnectDatabase();
    process.exit(0);

  } catch (error) {
    console.error('❌ Catalog sync failed:', error);
    loggingService.logError('SyncCatalogScript', error as Error, {
      context: 'manual sync'
    });
    process.exit(1);
  }
}

syncCatalog();
