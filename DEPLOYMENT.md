# Smart vCard Deployment Guide

This document explains how to deploy the Smart vCard application with path-based card URLs.

## Architecture Overview

The system consists of three components:

1. **Frontend (Nuxt.js)** - Runs on port 4645, serves the vCard generator interface
2. **Backend API (Express)** - Runs on port 4646, handles card deployment
3. **Caddy** - Web server that routes requests and serves deployed cards

## URL Structure

- **Main App**: `https://smartvcards.erixhens.com/` - vCard generator interface
- **API**: `https://smartvcards.erixhens.com/api/*` - Deployment API endpoints
- **Deployed Cards**: `https://smartvcards.erixhens.com/client-id` - Individual vCards

Example: A card with client ID `test-client-1` will be available at:
`https://smartvcards.erixhens.com/test-client-1`

## Quick Start

### 1. Frontend Setup

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production
yarn generate

# The static files will be in the public/ directory
```

### 2. Backend API Setup

```bash
# Go to server directory
cd server

# Install dependencies
npm install

# Create vcards directory
sudo mkdir -p /var/www/vcards
sudo chown -R $USER:$USER /var/www/vcards

# Run development server
npm run dev

# Or for production with PM2
npm install -g pm2
pm2 start index.js --name smartvcard-api
pm2 startup
pm2 save
```

### 3. Caddy Configuration

```bash
# Copy the Caddy config
sudo cp server/smartvcard.on /path/to/your/caddy/sites/

# Reload Caddy
sudo caddy reload
```

## File Structure

```
smartvcard/
├── server/                       # Backend API
│   ├── index.js                 # Express server
│   ├── package.json
│   ├── smartvcard.on            # Caddy config
│   └── README.md
├── components/
│   └── Download.vue             # Updated with deploy button
├── pages/
│   └── index.vue                # Main page with deployCardToServer()
└── public/                      # Built Nuxt app (after yarn generate)
```

## Deployed Cards Structure

```
/var/www/vcards/
├── test-client-1/
│   ├── index.html
│   ├── style.min.css
│   ├── qrcode.min.js
│   ├── logo.png
│   ├── background.jpg
│   ├── test-client-1.vcf
│   └── media/
│       ├── video.mp4
│       └── music.mp3
├── another-client/
│   └── ...
```

## How It Works

### 1. User Creates a Card

User fills out the form at `smartvcards.erixhens.com` and clicks "🚀 Deploy to Live URL"

### 2. Frontend Sends Data to API

The frontend:
- Generates HTML from the card data
- Converts images/media to base64
- Sends everything to `/api/deploy`

### 3. Backend Saves Files

The API:
- Validates the client ID
- Creates a directory at `/var/www/vcards/{client-id}`
- Saves all files (HTML, CSS, images, media)
- Returns the live URL

### 4. Caddy Serves the Card

Caddy detects requests to `/{client-id}` and serves files from `/var/www/vcards/{client-id}/`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/check-client/:clientId` | GET | Check if client ID is available |
| `/api/deploy` | POST | Deploy a new card |
| `/api/deploy/:clientId` | PUT | Update existing card |
| `/api/deploy/:clientId` | DELETE | Delete a card |
| `/health` | GET | Health check |

## Environment Variables

### Frontend (Nuxt)
No special environment variables needed for basic setup.

### Backend (Express)
Create a `.env` file in the `server/` directory:

```bash
PORT=4646
VCARDS_DIR=/var/www/vcards
BASE_URL=https://smartvcards.erixhens.com
NODE_ENV=production
```

## Production Deployment

### Using PM2 (Recommended)

**Frontend:**
```bash
# Build the app
yarn generate

# Serve with PM2
cd public
pm2 serve . 4645 --name smartvcard-frontend --spa
pm2 save
```

**Backend:**
```bash
cd server
pm2 start index.js --name smartvcard-api
pm2 save
```

### Using Systemd

Create `/etc/systemd/system/smartvcard-api.service`:

```ini
[Unit]
Description=Smart vCard Deployment API
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/smartvcard/server
ExecStart=/usr/bin/node index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=4646

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable smartvcard-api
sudo systemctl start smartvcard-api
```

## Security Considerations

1. **Client ID Validation**: Only alphanumeric, hyphens, and underscores allowed
2. **File Size Limits**: 50MB maximum request size
3. **CORS**: Enabled for API access
4. **HTTPS**: Caddy automatically handles SSL certificates
5. **File Permissions**: Ensure proper ownership of `/var/www/vcards`

## Troubleshooting

### Cards not deploying
- Check API logs: `pm2 logs smartvcard-api`
- Verify `/var/www/vcards` exists and is writable
- Test API: `curl http://localhost:4646/health`

### Cards not loading
- Check Caddy config: `caddy validate`
- Verify files exist: `ls /var/www/vcards/client-id`
- Check Caddy logs: `sudo journalctl -u caddy`

### Frontend not connecting to API
- Ensure both services are running
- Check browser console for CORS errors
- Verify Caddy is routing `/api/*` correctly

## Upgrading

### Frontend
```bash
git pull
yarn install
yarn generate
pm2 restart smartvcard-frontend
```

### Backend
```bash
cd server
git pull
npm install
pm2 restart smartvcard-api
```

## Backup

Regular backups of `/var/www/vcards/` are recommended:

```bash
# Create backup
tar -czf vcards-backup-$(date +%Y%m%d).tar.gz /var/www/vcards/

# Restore backup
tar -xzf vcards-backup-20250101.tar.gz -C /
```

## License

Same as main project (AGPL-3.0)
