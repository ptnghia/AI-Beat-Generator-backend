# Database Backup and Restoration Procedures

## Overview

The system includes automated daily backups and manual backup/restore capabilities to ensure data safety and disaster recovery.

## Automated Backups

### Schedule
- **Frequency**: Daily
- **Time**: 00:00 UTC
- **Retention**: Last 7 backups are kept automatically
- **Location**: `./backups/` directory (configurable via `BACKUP_DIR` env variable)

### Configuration

Add to your `.env` file:

```env
# Backup directory (optional, defaults to ./backups)
BACKUP_DIR=./backups
```

The backup scheduler starts automatically when the application starts.

## Manual Backup

### Create a Backup

```bash
npm run backup
```

This will:
1. Create a SQL dump of the entire database
2. Save it to the backup directory with timestamp
3. Display list of recent backups
4. Clean old backups (keeping last 7)

### Backup File Format

Backup files are named: `backup-{database}-{timestamp}.sql`

Example: `backup-beat_generator-2024-12-13T10-30-00-000Z.sql`

## Database Restoration

### List Available Backups

```bash
npm run restore
```

This will display all available backup files with their sizes and creation dates.

### Restore from Backup

```bash
npm run restore <path-to-backup-file>
```

Example:
```bash
npm run restore ./backups/backup-beat_generator-2024-12-13T10-30-00-000Z.sql
```

**⚠️ WARNING**: Restoration will replace ALL current data with data from the backup file. You will be asked to confirm before proceeding.

## Backup Best Practices

### 1. Regular Testing
- Test restoration procedure monthly
- Verify backup file integrity
- Ensure backup files are readable

### 2. Off-site Storage
- Copy backups to external storage (S3, Google Drive, etc.)
- Keep at least 30 days of backups off-site
- Automate off-site backup transfer

### 3. Before Major Changes
- Always create a manual backup before:
  - Database schema migrations
  - Bulk data operations
  - System upgrades
  - Configuration changes

### 4. Monitoring
- Check backup logs daily
- Verify backup file sizes are reasonable
- Alert on backup failures

## Disaster Recovery

### Complete System Failure

1. **Setup new environment**
   ```bash
   npm install
   npx prisma generate
   ```

2. **Restore database**
   ```bash
   npm run restore <latest-backup-file>
   ```

3. **Verify data integrity**
   - Check beat count
   - Verify API keys
   - Test catalog sync

4. **Start system**
   ```bash
   npm start
   ```

### Partial Data Loss

1. **Identify affected data**
   - Check execution logs
   - Review error messages

2. **Find appropriate backup**
   ```bash
   npm run restore  # List backups
   ```

3. **Restore to test environment first**
   - Verify data is correct
   - Test system functionality

4. **Restore to production**
   ```bash
   npm run restore <backup-file>
   ```

## Troubleshooting

### Backup Fails

**Error**: `mysqldump: command not found`
- **Solution**: Install MySQL client tools
  ```bash
  # macOS
  brew install mysql-client
  
  # Ubuntu/Debian
  sudo apt-get install mysql-client
  ```

**Error**: `Access denied for user`
- **Solution**: Check DATABASE_URL credentials in `.env`

**Error**: `Disk space full`
- **Solution**: 
  - Clean old backups manually
  - Increase disk space
  - Change BACKUP_DIR to larger volume

### Restore Fails

**Error**: `Backup file not found`
- **Solution**: Verify file path is correct
- Use absolute path if relative path fails

**Error**: `Unknown database`
- **Solution**: Create database first
  ```bash
  mysql -u root -p -e "CREATE DATABASE beat_generator;"
  ```

**Error**: `Table already exists`
- **Solution**: Drop existing tables or use fresh database

## Security Considerations

### Backup File Security

1. **Encryption**
   - Encrypt backup files before off-site storage
   - Use GPG or similar encryption tools

2. **Access Control**
   - Restrict backup directory permissions
   - Only authorized users should access backups

3. **Sensitive Data**
   - Backup files contain API keys and sensitive data
   - Never commit backup files to version control
   - Add `backups/` to `.gitignore`

### Database Credentials

- Never hardcode credentials in scripts
- Use environment variables only
- Rotate database passwords regularly
- Use read-only credentials for backup operations when possible

## Automation Scripts

### Automated Off-site Backup (Example)

```bash
#!/bin/bash
# backup-to-s3.sh

# Create backup
npm run backup

# Get latest backup file
LATEST_BACKUP=$(ls -t ./backups/*.sql | head -1)

# Upload to S3
aws s3 cp "$LATEST_BACKUP" s3://my-bucket/database-backups/

# Clean local old backups (keep last 7)
ls -t ./backups/*.sql | tail -n +8 | xargs rm -f
```

### Scheduled Backup Verification

```bash
#!/bin/bash
# verify-backup.sh

# Get latest backup
LATEST_BACKUP=$(ls -t ./backups/*.sql | head -1)

# Check file size (should be > 1MB)
SIZE=$(stat -f%z "$LATEST_BACKUP")
if [ $SIZE -lt 1048576 ]; then
    echo "WARNING: Backup file is too small!"
    # Send alert
fi

# Check file age (should be < 25 hours)
AGE=$(($(date +%s) - $(stat -f%m "$LATEST_BACKUP")))
if [ $AGE -gt 90000 ]; then
    echo "WARNING: Backup file is too old!"
    # Send alert
fi
```

## Support

For backup-related issues:
1. Check application logs: `./logs/app.log`
2. Review backup scheduler logs
3. Verify database connectivity
4. Contact system administrator
