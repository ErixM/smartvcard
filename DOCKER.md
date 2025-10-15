# Smart vCard - Docker Deployment Guide

This guide explains how to deploy Smart vCard using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Caddy web server (running on host, not in Docker)
- Domain configured: `smartvcards.erixhens.com`

## Quick Start

### 1. Build and Start Containers

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 2. Verify Services

```bash
# Frontend should be running on port 4645
curl http://localhost:4645

# Backend should be running on port 4646
curl http://localhost:4646/health
```

### 3. Configure Caddy

The Caddy configuration file `server/smartvcard.on` should already be copied to your server:

```bash
# Ensure Caddy config is in place
sudo cp server/smartvcard.on /etc/caddy/sites/

# Reload Caddy
sudo caddy reload
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    Caddy                        │
│         (smartvcards.erixhens.com)              │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐             │
│  │   /api/*    │  │  /{client}  │             │
│  │   → 4646    │  │  → vcards/  │             │
│  └─────────────┘  └─────────────┘             │
│         │                                       │
│  ┌──────▼────────┐                             │
│  │      /        │                             │
│  │   → 4645      │                             │
│  └───────────────┘                             │
└─────────────────────────────────────────────────┘
         │              │              │
         │              │              │
    ┌────▼────┐    ┌────▼────┐   ┌────▼────┐
    │Frontend │    │ Backend │   │ Volume  │
    │  :4645  │    │  :4646  │   │ vcards  │
    │(Nuxt.js)│    │(Express)│   │  data   │
    └─────────┘    └─────────┘   └─────────┘
```

## Services

### Frontend (Nuxt.js SPA)
- **Port**: 4645
- **Image**: Built from `Dockerfile.frontend`
- **Purpose**: Serves the vCard generator interface
- **Technology**: Node.js 24 + Nuxt 2

### Backend (Express API)
- **Port**: 4646
- **Image**: Built from `Dockerfile.backend`
- **Purpose**: Handles card deployment and storage
- **Technology**: Node.js 24 + Express 5
- **Volume**: `/var/www/vcards` (persists deployed cards)

## Docker Compose Commands

### Start Services
```bash
# Start in background
docker-compose up -d

# Start with build
docker-compose up -d --build

# Start specific service
docker-compose up -d frontend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all deployed cards)
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild Images
```bash
# Rebuild all images
docker-compose build

# Rebuild specific image
docker-compose build frontend

# Rebuild without cache
docker-compose build --no-cache
```

## Environment Variables

You can customize environment variables in `docker-compose.yml`:

### Frontend
```yaml
environment:
  - NODE_ENV=production
  - HOST=0.0.0.0
  - PORT=4645
```

### Backend
```yaml
environment:
  - NODE_ENV=production
  - PORT=4646
  - VCARDS_DIR=/var/www/vcards
  - BASE_URL=https://smartvcards.erixhens.com
```

Or create a `.env` file:
```bash
# .env file
NODE_ENV=production
BASE_URL=https://smartvcards.erixhens.com
```

## Volume Management

### Backup Deployed Cards
```bash
# Create backup
docker run --rm -v smartvcard_vcards-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/vcards-backup-$(date +%Y%m%d).tar.gz -C /data .

# List backups
ls -lh vcards-backup-*.tar.gz
```

### Restore Deployed Cards
```bash
# Restore from backup
docker run --rm -v smartvcard_vcards-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/vcards-backup-20250115.tar.gz -C /data
```

### Inspect Volume
```bash
# List volume contents
docker run --rm -v smartvcard_vcards-data:/data alpine ls -la /data

# Get volume info
docker volume inspect smartvcard_vcards-data
```

## Health Checks

Both services have health checks configured:

```bash
# Check frontend health
docker inspect smartvcard-frontend | grep -A 5 Health

# Check backend health
docker inspect smartvcard-backend | grep -A 5 Health

# Manual health check
curl http://localhost:4645  # Frontend
curl http://localhost:4646/health  # Backend
```

## Updating the Application

### Update Code
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose build frontend
docker-compose up -d frontend
```

### Update Dependencies
If `package.json` changes:
```bash
# Rebuild with no cache to ensure fresh dependencies
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs frontend
docker-compose logs backend

# Check container status
docker-compose ps

# Inspect container
docker inspect smartvcard-frontend
```

### Port Already in Use
```bash
# Find what's using the port
sudo lsof -i :4645
sudo lsof -i :4646

# Stop conflicting service or change port in docker-compose.yml
```

### Volume Permission Issues
```bash
# Fix volume permissions
docker-compose exec backend chown -R node:node /var/www/vcards
```

### Cannot Connect to API
```bash
# Test network connectivity
docker-compose exec frontend wget -O- http://backend:4646/health

# Check network
docker network inspect smartvcard_smartvcard-network
```

### Clear Everything and Start Fresh
```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove images
docker rmi $(docker images 'smartvcard*' -q)

# Rebuild and start
docker-compose up -d --build
```

## Production Best Practices

### 1. Use Docker Secrets for Sensitive Data
Instead of environment variables, use Docker secrets:
```yaml
secrets:
  api_key:
    file: ./secrets/api_key.txt

services:
  backend:
    secrets:
      - api_key
```

### 2. Limit Resources
Add resource limits to prevent containers from consuming too much:
```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M
```

### 3. Use Multi-Stage Builds
Both Dockerfiles already use best practices for smaller images.

### 4. Regular Backups
Set up automated backups:
```bash
# Add to crontab
0 2 * * * docker run --rm -v smartvcard_vcards-data:/data -v /backups:/backup alpine tar czf /backup/vcards-$(date +\%Y\%m\%d).tar.gz -C /data .
```

### 5. Monitor Logs
Use a log aggregation service or:
```bash
# Rotate logs to prevent disk space issues
docker-compose logs --tail=1000 > smartvcard-logs-$(date +%Y%m%d).log
```

## Security Considerations

1. **Never expose Docker API** to the internet
2. **Use read-only volumes** where possible
3. **Run containers as non-root** user (already configured)
4. **Keep images updated** regularly
5. **Use Docker secrets** for sensitive data
6. **Enable firewall** rules for Docker ports

## Monitoring

### Container Stats
```bash
# Real-time stats
docker stats smartvcard-frontend smartvcard-backend

# Memory usage
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"
```

### Disk Usage
```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## Uninstalling

```bash
# Stop and remove everything
docker-compose down -v

# Remove images
docker rmi $(docker images 'smartvcard*' -q)

# Remove unused volumes
docker volume prune
```

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for general deployment info
- Check [server/README.md](server/README.md) for API documentation

## License

Same as main project (AGPL-3.0)
