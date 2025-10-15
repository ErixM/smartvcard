# Smart vCard - Docker Hub Deployment Guide

This guide explains how to build, push to Docker Hub, and deploy the Smart vCard application using pre-built images.

## Docker Hub Repositories

- **Frontend**: `erixhens/smart-v-card-frontend`
- **Backend**: `erixhens/smart-v-card-backend`

## Prerequisites

- [just](https://github.com/casey/just) command runner installed
- Docker installed and running
- Docker Hub account (erixhens)

## Quick Start

### 1. Build and Push Images

```bash
# Install just if not already installed
# macOS: brew install just
# Linux: cargo install just

# Login to Docker Hub
just login

# Build and push both images (with version tag)
just release 1.0.0

# Or build and push with 'latest' tag
just release
```

### 2. Deploy on Server

```bash
# On your local machine, copy files to server
scp docker-compose.production.yml your-server:~/smartvcard/
scp server/smartvcard.on your-server:~/smartvcard/

# SSH into your server
ssh your-server

# Navigate to deployment directory
cd ~/smartvcard

# Pull latest images from Docker Hub
docker compose -f docker-compose.production.yml pull

# Start services
docker compose -f docker-compose.production.yml up -d

# Copy Caddy config and reload
sudo cp smartvcard.on /etc/caddy/sites/
sudo caddy reload
```

## Justfile Commands

The `justfile` provides convenient commands for managing the Docker workflow:

### Building Images

```bash
# Build both images
just build

# Build with specific version
just build 1.0.0

# Build frontend only
just build-frontend

# Build backend only
just build-backend
```

### Pushing to Docker Hub

```bash
# Push both images (automatically logs in)
just push

# Push with specific version
just push 1.0.0

# Push frontend only
just push-frontend

# Push backend only
just push-backend
```

### Release (Build + Push)

```bash
# Build and push in one command
just release

# Build and push specific version
just release 1.0.0
```

### Pulling Images (On Server)

```bash
# Pull latest images
just pull

# Pull specific version
just pull 1.0.0
```

### Running Services

```bash
# Start development services (uses docker-compose.yml)
just up

# Start production services (uses docker-compose.production.yml)
just up-prod

# Stop services
just down
just down-prod

# View logs
just logs
just logs-prod

# Check status
just ps
just ps-prod
```

### Backup & Restore

```bash
# Backup vCards data
just backup

# Restore from backup
just restore vcards-backup-20250115-143022.tar.gz
```

### Maintenance

```bash
# View all available commands
just --list

# Clean up Docker resources
just clean

# Show image sizes
just image-sizes

# Restart development environment
just restart
```

## Deployment Workflow

### First-Time Setup on Server

1. **Install Docker and Docker Compose** on your server:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

2. **Create deployment directory**:
```bash
mkdir -p ~/smartvcard
cd ~/smartvcard
```

3. **Copy deployment files**:
```bash
# From your local machine
scp docker-compose.production.yml your-server:~/smartvcard/
scp server/smartvcard.on your-server:~/smartvcard/
```

4. **Pull and start services**:
```bash
# On the server
cd ~/smartvcard
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

5. **Configure Caddy**:
```bash
sudo cp smartvcard.on /etc/caddy/sites/
sudo caddy reload
```

### Updating to New Version

1. **On local machine - build and push**:
```bash
just release 1.1.0
```

2. **On server - pull and restart**:
```bash
cd ~/smartvcard
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
```

Or use the deploy command:
```bash
# From local machine
just deploy-server your-server 1.1.0
```

## File Structure

```
smartvcard/
├── Dockerfile.frontend          # Frontend build instructions
├── Dockerfile.backend           # Backend build instructions
├── docker-compose.yml           # Development compose file (builds locally)
├── docker-compose.production.yml # Production compose file (uses Docker Hub)
├── justfile                     # Command runner recipes
└── .dockerignore               # Files to exclude from builds
```

## Environment Variables

You can customize the deployment by creating a `.env` file on your server:

```bash
# .env
NODE_ENV=production
BASE_URL=https://smartvcards.erixhens.com
VCARDS_DIR=/var/www/vcards
```

Then reference it in docker-compose:
```yaml
services:
  backend:
    env_file: .env
```

## Volume Management

### Using Named Volume (Default)
The default configuration uses a Docker named volume:
```yaml
volumes:
  - vcards-data:/var/www/vcards
```

**Pros**: Managed by Docker, portable, easy to backup
**Cons**: Not directly accessible on host filesystem

### Using Bind Mount (Alternative)
Uncomment in `docker-compose.production.yml`:
```yaml
volumes:
  # - vcards-data:/var/www/vcards  # Comment this
  - /var/www/vcards:/var/www/vcards  # Uncomment this
```

**Pros**: Directly accessible on host, easier to browse
**Cons**: Requires directory setup, permission management

## Monitoring

### View Logs
```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100
```

### Check Health
```bash
# Check container health
docker ps

# Detailed health status
docker inspect smartvcard-backend | grep -A 10 Health

# Test endpoints
curl http://localhost:4645  # Frontend
curl http://localhost:4646/health  # Backend
```

### Resource Usage
```bash
# Real-time stats
docker stats smartvcard-frontend smartvcard-backend

# Disk usage
docker system df
```

## Troubleshooting

### Image Pull Fails
```bash
# Verify you're logged in
docker login

# Manually pull images
docker pull erixhens/smart-v-card-frontend:latest
docker pull erixhens/smart-v-card-backend:latest
```

### Container Won't Start
```bash
# Check logs
docker compose -f docker-compose.production.yml logs backend

# Inspect container
docker inspect smartvcard-backend

# Remove and recreate
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

### Port Already in Use
```bash
# Find what's using the port
sudo lsof -i :4645
sudo lsof -i :4646

# Stop conflicting service or change ports in docker-compose.production.yml
```

### Permission Issues
```bash
# Fix volume permissions
docker compose -f docker-compose.production.yml exec backend chown -R node:node /var/www/vcards
```

## Security Best Practices

1. **Keep images updated**: Regularly rebuild and push new versions
2. **Use specific version tags**: Don't rely only on `latest` in production
3. **Limit exposed ports**: Only expose necessary ports
4. **Use secrets**: For sensitive data, use Docker secrets instead of env vars
5. **Regular backups**: Automate vCard data backups
6. **Monitor logs**: Set up log aggregation and monitoring

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Build and Push

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        run: |
          just release ${GITHUB_REF#refs/tags/v}
```

## Rollback

If a deployment fails, quickly rollback to previous version:

```bash
# On server
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml pull
docker image tag erixhens/smart-v-card-backend:1.0.0 erixhens/smart-v-card-backend:latest
docker image tag erixhens/smart-v-card-frontend:1.0.0 erixhens/smart-v-card-frontend:latest
docker compose -f docker-compose.production.yml up -d
```

## Support

- **Local Development**: See [DOCKER.md](DOCKER.md)
- **General Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **API Documentation**: See [server/README.md](server/README.md)

## License

Same as main project (AGPL-3.0)
