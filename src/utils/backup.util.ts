import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { loggingService } from '../services/logging.service';

const execAsync = promisify(exec);

export interface BackupConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  backupDir: string;
}

export class BackupUtil {
  private config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = config;
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      loggingService.info('Created backup directory', {
        service: 'BackupUtil',
        path: this.config.backupDir
      });
    }
  }

  /**
   * Create database backup
   * Uses mysqldump to create a SQL dump file
   * 
   * @returns Path to the backup file
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${this.config.database}-${timestamp}.sql`;
    const filepath = path.join(this.config.backupDir, filename);

    try {
      loggingService.info('Starting database backup', {
        service: 'BackupUtil',
        database: this.config.database,
        filepath
      });

      // Build mysqldump command
      const command = `mysqldump -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.config.database} > ${filepath}`;

      await execAsync(command);

      // Verify backup file was created
      if (!fs.existsSync(filepath)) {
        throw new Error('Backup file was not created');
      }

      const stats = fs.statSync(filepath);
      loggingService.info('Database backup completed successfully', {
        service: 'BackupUtil',
        database: this.config.database,
        filepath,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`
      });

      return filepath;
    } catch (error) {
      loggingService.logError('BackupUtil', error as Error, {
        context: 'createBackup',
        database: this.config.database
      });
      throw error;
    }
  }

  /**
   * Restore database from backup file
   * 
   * @param backupFilePath - Path to the backup SQL file
   */
  async restoreBackup(backupFilePath: string): Promise<void> {
    try {
      if (!fs.existsSync(backupFilePath)) {
        throw new Error(`Backup file not found: ${backupFilePath}`);
      }

      loggingService.info('Starting database restoration', {
        service: 'BackupUtil',
        database: this.config.database,
        backupFile: backupFilePath
      });

      // Build mysql restore command
      const command = `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} -p${this.config.password} ${this.config.database} < ${backupFilePath}`;

      await execAsync(command);

      loggingService.info('Database restoration completed successfully', {
        service: 'BackupUtil',
        database: this.config.database,
        backupFile: backupFilePath
      });
    } catch (error) {
      loggingService.logError('BackupUtil', error as Error, {
        context: 'restoreBackup',
        database: this.config.database,
        backupFile: backupFilePath
      });
      throw error;
    }
  }

  /**
   * List all available backup files
   * 
   * @returns Array of backup file information
   */
  listBackups(): Array<{ filename: string; path: string; size: number; created: Date }> {
    try {
      const files = fs.readdirSync(this.config.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
        .map(file => {
          const filepath = path.join(this.config.backupDir, file);
          const stats = fs.statSync(filepath);
          return {
            filename: file,
            path: filepath,
            size: stats.size,
            created: stats.birthtime
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());

      return backupFiles;
    } catch (error) {
      loggingService.logError('BackupUtil', error as Error, {
        context: 'listBackups'
      });
      return [];
    }
  }

  /**
   * Delete old backup files
   * Keeps only the specified number of most recent backups
   * 
   * @param keepCount - Number of backups to keep
   */
  cleanOldBackups(keepCount: number = 7): void {
    try {
      const backups = this.listBackups();

      if (backups.length <= keepCount) {
        loggingService.debug('No old backups to clean', {
          service: 'BackupUtil',
          totalBackups: backups.length,
          keepCount
        });
        return;
      }

      const backupsToDelete = backups.slice(keepCount);
      let deletedCount = 0;

      for (const backup of backupsToDelete) {
        try {
          fs.unlinkSync(backup.path);
          deletedCount++;
        } catch (error) {
          loggingService.error('Failed to delete backup file', {
            service: 'BackupUtil',
            file: backup.filename,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      loggingService.info('Cleaned old backup files', {
        service: 'BackupUtil',
        deletedCount,
        remainingCount: backups.length - deletedCount
      });
    } catch (error) {
      loggingService.logError('BackupUtil', error as Error, {
        context: 'cleanOldBackups'
      });
    }
  }
}

/**
 * Create backup utility instance from environment variables
 */
export function createBackupUtil(): BackupUtil {
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // Support both with and without password: mysql://user:pass@host:port/db or mysql://user@host:port/db
  const urlMatch = databaseUrl.match(/mysql:\/\/([^:@]+)(?::([^@]*))?@([^:]+):(\d+)\/(.+)/);

  if (!urlMatch) {
    // For test environment, use default values
    if (process.env.NODE_ENV === 'test') {
      const config: BackupConfig = {
        host: 'localhost',
        port: 3306,
        database: 'test_db',
        username: 'root',
        password: '',
        backupDir: process.env.BACKUP_DIR || './backups'
      };
      return new BackupUtil(config);
    }
    throw new Error('Invalid DATABASE_URL format. Expected: mysql://user[:password]@host:port/database');
  }

  const [, username, password = '', host, port, database] = urlMatch;

  const config: BackupConfig = {
    host,
    port: parseInt(port, 10),
    database,
    username,
    password,
    backupDir: process.env.BACKUP_DIR || './backups'
  };

  return new BackupUtil(config);
}
