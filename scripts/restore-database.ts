#!/usr/bin/env ts-node

/**
 * Database restoration script
 * Usage: npm run restore <backup-file-path>
 */

import { createBackupUtil } from '../src/utils/backup.util';
import { loggingService } from '../src/services/logging.service';
import * as readline from 'readline';

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  try {
    const backupFilePath = process.argv[2];

    if (!backupFilePath) {
      console.error('Usage: npm run restore <backup-file-path>');
      console.log('\nAvailable backups:');
      
      const backupUtil = createBackupUtil();
      const backups = backupUtil.listBackups();
      
      if (backups.length === 0) {
        console.log('  No backups found');
      } else {
        backups.forEach((backup, index) => {
          const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
          console.log(`  ${index + 1}. ${backup.path} (${sizeMB} MB) - ${backup.created.toLocaleString()}`);
        });
      }
      
      process.exit(1);
    }

    console.log(`\n⚠️  WARNING: This will restore the database from backup.`);
    console.log(`   All current data will be replaced with data from:`);
    console.log(`   ${backupFilePath}\n`);

    const confirmed = await askConfirmation('Are you sure you want to continue? (yes/no): ');

    if (!confirmed) {
      console.log('Restoration cancelled.');
      process.exit(0);
    }

    console.log('\nStarting database restoration...');

    const backupUtil = createBackupUtil();
    await backupUtil.restoreBackup(backupFilePath);

    console.log('✓ Database restored successfully');

    process.exit(0);
  } catch (error) {
    console.error('✗ Restoration failed:', error);
    loggingService.logError('RestoreScript', error as Error, {
      context: 'manual restore'
    });
    process.exit(1);
  }
}

main();
