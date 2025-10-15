# Smart vCard - Justfile
# Build, push, and deploy Docker images

# Configuration
docker_username := "erixhens"
frontend_image := "smart-v-card-frontend"
backend_image := "smart-v-card-backend"
version := env_var_or_default("VERSION", "latest")

# Default recipe - show available commands
default:
    @just --list

# Build both frontend and backend images
build version=version:
    @echo "Building Smart vCard Docker Images (version: {{version}})"
    docker build -f Dockerfile.frontend \
        -t {{docker_username}}/{{frontend_image}}:{{version}} \
        -t {{docker_username}}/{{frontend_image}}:latest \
        .
    docker build -f Dockerfile.backend \
        -t {{docker_username}}/{{backend_image}}:{{version}} \
        -t {{docker_username}}/{{backend_image}}:latest \
        .
    @echo "✅ Build complete!"

# Build frontend image only
build-frontend version=version:
    @echo "Building Frontend Image (version: {{version}})"
    docker build -f Dockerfile.frontend \
        -t {{docker_username}}/{{frontend_image}}:{{version}} \
        -t {{docker_username}}/{{frontend_image}}:latest \
        .

# Build backend image only
build-backend version=version:
    @echo "Building Backend Image (version: {{version}})"
    docker build -f Dockerfile.backend \
        -t {{docker_username}}/{{backend_image}}:{{version}} \
        -t {{docker_username}}/{{backend_image}}:latest \
        .

# Login to Docker Hub
login:
    @echo "Logging in to Docker Hub..."
    docker login

# Push both images to Docker Hub
push version=version: login
    @echo "Pushing images to Docker Hub (version: {{version}})"
    docker push {{docker_username}}/{{frontend_image}}:{{version}}
    docker push {{docker_username}}/{{frontend_image}}:latest
    docker push {{docker_username}}/{{backend_image}}:{{version}}
    docker push {{docker_username}}/{{backend_image}}:latest
    @echo "✅ Push complete!"
    @echo ""
    @echo "Frontend: {{docker_username}}/{{frontend_image}}:{{version}}"
    @echo "Backend:  {{docker_username}}/{{backend_image}}:{{version}}"

# Push frontend image only
push-frontend version=version: login
    docker push {{docker_username}}/{{frontend_image}}:{{version}}
    docker push {{docker_username}}/{{frontend_image}}:latest

# Push backend image only
push-backend version=version: login
    docker push {{docker_username}}/{{backend_image}}:{{version}}
    docker push {{docker_username}}/{{backend_image}}:latest

# Build and push both images
release version=version: (build version) (push version)
    @echo "✅ Release {{version}} complete!"

# Pull images from Docker Hub (for server deployment)
pull version=version:
    docker pull {{docker_username}}/{{frontend_image}}:{{version}}
    docker pull {{docker_username}}/{{backend_image}}:{{version}}

# Start services using docker compose (development)
up:
    docker compose up -d

# Start services using production compose file
up-prod:
    docker compose -f docker-compose.production.yml up -d

# Stop services
down:
    docker compose down

# Stop production services
down-prod:
    docker compose -f docker-compose.production.yml down

# View logs
logs:
    docker compose logs -f

# View production logs
logs-prod:
    docker compose -f docker-compose.production.yml logs -f

# Rebuild and restart services (development)
restart: down (build version) up

# Clean up Docker resources
clean:
    docker compose down -v
    docker system prune -f

# Show running containers
ps:
    docker compose ps

# Show production containers
ps-prod:
    docker compose -f docker-compose.production.yml ps

# Backup vCards volume
backup:
    #!/usr/bin/env bash
    BACKUP_FILE="vcards-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    docker run --rm \
        -v smartvcard_vcards-data:/data \
        -v $(pwd):/backup \
        alpine tar czf /backup/$BACKUP_FILE -C /data .
    echo "✅ Backup created: $BACKUP_FILE"

# Restore vCards from backup file
restore BACKUP_FILE:
    docker run --rm \
        -v smartvcard_vcards-data:/data \
        -v $(pwd):/backup \
        alpine tar xzf /backup/{{BACKUP_FILE}} -C /data
    @echo "✅ Restored from: {{BACKUP_FILE}}"

# Show image sizes
image-sizes:
    @docker images {{docker_username}}/{{frontend_image}} {{docker_username}}/{{backend_image}}

# Run tests (if available)
test:
    @echo "Running tests..."
    yarn test || echo "No tests configured"

# Deploy to server (requires SSH access)
deploy-server SERVER version=version:
    @echo "Deploying to {{SERVER}}..."
    scp docker-compose.production.yml {{SERVER}}:~/smartvcard/
    scp server/smartvcard.on {{SERVER}}:~/smartvcard/
    ssh {{SERVER}} "cd ~/smartvcard && docker compose -f docker-compose.production.yml pull && docker compose -f docker-compose.production.yml up -d"
    @echo "✅ Deployed version {{version}} to {{SERVER}}"
