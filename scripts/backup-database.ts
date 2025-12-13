#!/usr/bin/env ts-node

/**
 * Manual database backup script
 * Usage: npm run backup
 */

import { createBackupUtil } from '../src/utils/backup.util';
import { loggingService } from '../src/services/logging.service';

async function main() {
  try {
    console.log('Starting database backup...');

    const backupUtil = createBackupUtil();
    const backupPath = await backupUtil.createBackup();

    console.log(`✓ Backup created successfully: ${backupPath}`);

    // List all backups
    const backups = backupUtil.listBackups();
    console.log(`\nTotal backups: ${backups.length}`);
    
    if (backups.length > 0) {
      console.log('\nRecent backups:');
      backups.slice(0, 5).forEach((backup, index) => {
        const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
        console.log(`  ${index + 1}. ${backup.filename} (${sizeMB} MB) - ${backup.created.toLocaleString()}`);
      });
    }

    // Clean old backups (keep last 7)
    console.log('\nCleaning old backups (keeping last 7)...');
    backupUtil.cleanOldBackups(7);
    console.log('✓ Cleanup completed');

    process.exit(0);
  } catch (error) {
    console.error('✗ Backup failed:', error);
    loggingService.logError('BackupScript', error as Error, {
      context: 'manual backup'
    });
    process.exit(1);
  }
}

main();
