# Deployment Guide - AI Beat Generator

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- At least 2GB RAM
- 10GB free disk space

## Quick Start (Production)

### 1. Clone & Setup

```bash
# Clone repository
git clone <your-repo-url>
cd ai-music

# Copy environment file
cp .env.production.example .env.production

# Edit with your API keys
nano .env.production
```

### 2. Configure API Keys

Edit `.env.production` and add your keys:

```bash
# Required
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
SUNO_API_KEYS=key1,key2,key3,key4

# Database passwords
MYSQL_ROOT_PASSWORD=strong_password_here
MYSQL_PASSWORD=another_strong_password
```

### 3. Start Services

```bash
# Build and start all services
docker-compose --env-file .env.production up -d

# Check logs
docker-compose logs -f app

# Check status
docker-compose ps
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# Sync beat catalog
docker-compose exec app npx ts-node scripts/sync-catalog.ts
```

### 5. Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Check stats
curl http://localhost:3000/api/stats

# Check beats
curl http://localhost:3000/api/beats
```

## Services

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| API Server | 3000 | http://localhost:3000 | Main application |
| MySQL | 3306 | localhost:3306 | Database |
| Adminer | 8080 | http://localhost:8080 | Database UI |

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# App only
docker-compose logs -f app

# Database only
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100 app
```

### Check Resource Usage

```bash
docker stats
```

### Database Access

**Via Adminer (Web UI):**
- Open: http://localhost:8080
- Server: `db`
- Username: `beatgen` (or your MYSQL_USER)
- Password: (your MYSQL_PASSWORD)
- Database: `beat_generator`

**Via CLI:**
```bash
docker-compose exec db mysql -u beatgen -p beat_generator
```

## Maintenance

### Backup Database

```bash
# Manual backup
docker-compose exec app npm run backup

# Or direct MySQL dump
docker-compose exec db mysqldump -u root -p beat_generator > backup.sql
```

### Restore Database

```bash
docker-compose exec -T db mysql -u root -p beat_generator < backup.sql
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Apply migrations
docker-compose exec app npx prisma migrate deploy
```

### Scale Beat Generation

```bash
# Increase scheduler frequency (edit .env.production)
SCHEDULER_INTERVAL=*/10 * * * *  # Every 10 minutes

# Restart
docker-compose restart app
```

## Troubleshooting

### App Won't Start

```bash
# Check logs
docker-compose logs app

# Check if DB is ready
docker-compose exec db mysqladmin ping -h localhost

# Restart services
docker-compose restart
```

### Database Connection Error

```bash
# Check DATABASE_URL in .env.production
# Format: mysql://USER:PASSWORD@db:3306/DATABASE

# Verify database is running
docker-compose ps db

# Check database logs
docker-compose logs db
```

### API Keys Not Working

```bash
# Verify keys are set
docker-compose exec app printenv | grep API_KEY

# Test APIs
docker-compose exec app npx ts-node scripts/test-api-keys.ts
```

### Out of Disk Space

```bash
# Check disk usage
docker system df

# Clean up old beats (if needed)
docker-compose exec app rm -rf output/beats/2024-11/*

# Prune Docker
docker system prune -a
```

### Beat Generation Failing

```bash
# Check scheduler logs
docker-compose logs app | grep Scheduler

# Check API key status
docker-compose exec app npx ts-node scripts/check-api-keys.ts

# Test full workflow
docker-compose exec app npx ts-node scripts/test-workflow.ts
```

## Production Best Practices

### 1. Security

- [ ] Change all default passwords in `.env.production`
- [ ] Use strong passwords (20+ characters)
- [ ] Never commit `.env.production` to git
- [ ] Restrict port access (firewall rules)
- [ ] Use HTTPS with reverse proxy (nginx/traefik)

### 2. Performance

- [ ] Monitor disk usage (beats + covers + previews)
- [ ] Set up log rotation
- [ ] Backup database daily
- [ ] Monitor API quota usage
- [ ] Consider Redis for caching (future)

### 3. Monitoring

- [ ] Set up uptime monitoring (UptimeRobot, etc.)
- [ ] Configure error alerts
- [ ] Monitor API costs
- [ ] Track beat generation rate
- [ ] Set up log aggregation (ELK, etc.)

### 4. Backup Strategy

```bash
# Add to crontab for daily backups
0 0 * * * cd /path/to/ai-music && docker-compose exec -T db mysqldump -u root -p${MYSQL_ROOT_PASSWORD} beat_generator | gzip > /backups/beat_generator_$(date +\%Y\%m\%d).sql.gz
```

## Advanced Configuration

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name beats.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment-Specific Configs

```bash
# Development
docker-compose --env-file .env.development up

# Staging
docker-compose --env-file .env.staging up

# Production
docker-compose --env-file .env.production up -d
```

## Stopping Services

```bash
# Stop without removing containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove everything (including volumes)
docker-compose down -v
```

## Support

- **Documentation**: See `/docs` folder
- **Issues**: Create GitHub issue
- **Logs**: Check `docker-compose logs`

## Next Steps

After successful deployment:

1. ✅ Verify all endpoints working
2. ✅ Test beat generation
3. ✅ Set up monitoring
4. ✅ Configure backups
5. 🚀 **Start building frontend!**
