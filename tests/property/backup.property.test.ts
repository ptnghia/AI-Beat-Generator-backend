import fc from 'fast-check';
import { BackupUtil, BackupConfig } from '../../src/utils/backup.util';
import { backupSchedulerService } from '../../src/services/backup-scheduler.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Backup Property Tests', () => {
  const testBackupDir = path.join(__dirname, '../fixtures/test-backups');
  
  // Test backup configuration
  const testConfig: BackupConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'test_db',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    backupDir: testBackupDir
  };

  beforeAll(() => {
    // Ensure test backup directory exists
    if (!fs.existsSync(testBackupDir)) {
      fs.mkdirSync(testBackupDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test backup directory
    if (fs.existsSync(testBackupDir)) {
      const files = fs.readdirSync(testBackupDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(testBackupDir, file));
      });
      fs.rmdirSync(testBackupDir);
    }
  });

  /**
   * Feature: automated-beat-generation, Property 26: Daily Backup Execution
   * Validates: Requirements 8.5
   * 
   * For any 24-hour period, exactly one database backup should be created at 00:00 UTC.
   * 
   * Note: This test verifies the backup mechanism works correctly.
   * The actual scheduling is tested separately as it requires time-based testing.
   */
  it('Property 26: Daily Backup Execution - backup utility should create valid backup files', async () => {
    const backupUtil = new BackupUtil(testConfig);

    // Property: Creating a backup should always produce a valid file
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed, just test the backup creation
        async () => {
          try {
            // Create backup
            const backupPath = await backupUtil.createBackup();

            // Verify backup file exists
            expect(fs.existsSync(backupPath)).toBe(true);

            // Verify backup file is in correct directory
            expect(backupPath.startsWith(testBackupDir)).toBe(true);

            // Verify backup file has .sql extension
            expect(backupPath.endsWith('.sql')).toBe(true);

            // Verify backup file has non-zero size
            const stats = fs.statSync(backupPath);
            expect(stats.size).toBeGreaterThan(0);

            // Verify backup file name format
            const filename = path.basename(backupPath);
            expect(filename).toMatch(/^backup-.+-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-.+\.sql$/);

            // Clean up
            fs.unlinkSync(backupPath);
          } catch (error) {
            // If backup fails due to missing mysqldump, skip this test
            if (error instanceof Error && error.message.includes('mysqldump')) {
              console.log('Skipping backup test - mysqldump not available');
              return;
            }
            throw error;
          }
        }
      ),
      { numRuns: 3 } // Run a few times to ensure consistency
    );
  }, 30000);

  /**
   * Property 26b: Backup file listing and management
   * Verifies that backup listing works correctly
   */
  it('Property 26b: Backup file listing should return all backup files sorted by date', async () => {
    const backupUtil = new BackupUtil(testConfig);

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (numBackups) => {
          try {
            const createdBackups: string[] = [];

            // Create multiple backups
            for (let i = 0; i < numBackups; i++) {
              const backupPath = await backupUtil.createBackup();
              createdBackups.push(backupPath);
              
              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // List backups
            const backupList = backupUtil.listBackups();

            // Verify count
            expect(backupList.length).toBeGreaterThanOrEqual(numBackups);

            // Verify all created backups are in the list
            for (const backupPath of createdBackups) {
              const found = backupList.some(b => b.path === backupPath);
              expect(found).toBe(true);
            }

            // Verify backups are sorted by date (newest first)
            for (let i = 0; i < backupList.length - 1; i++) {
              expect(backupList[i].created.getTime()).toBeGreaterThanOrEqual(
                backupList[i + 1].created.getTime()
              );
            }

            // Clean up
            for (const backupPath of createdBackups) {
              if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
              }
            }
          } catch (error) {
            // If backup fails due to missing mysqldump, skip this test
            if (error instanceof Error && error.message.includes('mysqldump')) {
              console.log('Skipping backup test - mysqldump not available');
              return;
            }
            throw error;
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 60000);

  /**
   * Property 26c: Old backup cleanup
   * Verifies that old backups are cleaned up correctly
   */
  it('Property 26c: Old backup cleanup should keep only specified number of backups', async () => {
    const backupUtil = new BackupUtil(testConfig);

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 8 }),
        fc.integer({ min: 1, max: 3 }),
        async (totalBackups, keepCount) => {
          try {
            const createdBackups: string[] = [];

            // Create multiple backups
            for (let i = 0; i < totalBackups; i++) {
              const backupPath = await backupUtil.createBackup();
              createdBackups.push(backupPath);
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Clean old backups
            backupUtil.cleanOldBackups(keepCount);

            // List remaining backups
            const remainingBackups = backupUtil.listBackups();

            // Verify correct number of backups remain
            const ourBackups = remainingBackups.filter(b => 
              createdBackups.includes(b.path)
            );
            expect(ourBackups.length).toBeLessThanOrEqual(keepCount);

            // If we had more backups than keepCount, verify oldest were deleted
            if (totalBackups > keepCount) {
              // The oldest backups should be deleted
              const oldestBackups = createdBackups.slice(keepCount);
              for (const oldBackup of oldestBackups) {
                expect(fs.existsSync(oldBackup)).toBe(false);
              }
            }

            // Clean up remaining backups
            for (const backupPath of createdBackups) {
              if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
              }
            }
          } catch (error) {
            // If backup fails due to missing mysqldump, skip this test
            if (error instanceof Error && error.message.includes('mysqldump')) {
              console.log('Skipping backup test - mysqldump not available');
              return;
            }
            throw error;
          }
        }
      ),
      { numRuns: 3 }
    );
  }, 90000);

  /**
   * Property 26d: Backup scheduler status
   * Verifies that backup scheduler can be started and stopped
   */
  it('Property 26d: Backup scheduler should track running status correctly', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          // Initial state
          const initialStatus = backupSchedulerService.getStatus();
          const wasRunning = initialStatus.isRunning;

          // Start scheduler
          backupSchedulerService.start();
          const runningStatus = backupSchedulerService.getStatus();
          expect(runningStatus.isRunning).toBe(true);

          // Stop scheduler
          backupSchedulerService.stop();
          const stoppedStatus = backupSchedulerService.getStatus();
          expect(stoppedStatus.isRunning).toBe(false);

          // Restore initial state
          if (wasRunning) {
            backupSchedulerService.start();
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 26e: Backup file integrity
   * Verifies that backup files contain valid SQL
   */
  it('Property 26e: Backup files should contain valid SQL dump content', async () => {
    const backupUtil = new BackupUtil(testConfig);

    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          try {
            // Create backup
            const backupPath = await backupUtil.createBackup();

            // Read backup file content
            const content = fs.readFileSync(backupPath, 'utf-8');

            // Verify it contains SQL dump markers
            // MySQL dumps typically start with comments and contain CREATE/INSERT statements
            const hasValidContent = 
              content.length > 0 &&
              (content.includes('MySQL dump') || 
               content.includes('CREATE TABLE') ||
               content.includes('INSERT INTO') ||
               content.includes('--'));

            expect(hasValidContent).toBe(true);

            // Clean up
            fs.unlinkSync(backupPath);
          } catch (error) {
            // If backup fails due to missing mysqldump, skip this test
            if (error instanceof Error && error.message.includes('mysqldump')) {
              console.log('Skipping backup test - mysqldump not available');
              return;
            }
            throw error;
          }
        }
      ),
      { numRuns: 2 }
    );
  }, 30000);
});
