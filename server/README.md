# Smart vCard Deployment API

Backend API server for deploying Smart vCards to path-based URLs (e.g., `smartvcard.erixhens.com/client-id`).

## Features

- ✅ Path-based card deployment (no wildcard DNS needed)
- ✅ Automatic file system organization
- ✅ Client ID validation and availability checking
- ✅ Support for images, media, and vCard files
- ✅ Full CRUD operations (Create, Read, Update, Delete)
- ✅ Built with Express 5 and Node.js 24+

## Requirements

- Node.js >= 24.0.0
- Caddy web server
- Write permissions to `/var/www/vcards`

## Installation

1. Install dependencies:
```bash
cd server
npm install
```

2. Create the vcards directory:
```bash
sudo mkdir -p /var/www/vcards
sudo chown -R $USER:$USER /var/www/vcards
```

3. Copy the Caddy configuration:
```bash
sudo cp smartvcard.on /etc/caddy/sites/
sudo caddy reload
```

## Configuration

Environment variables (optional):

```bash
PORT=4646                                    # API server port
VCARDS_DIR=/var/www/vcards                   # Directory to store cards
BASE_URL=https://smartvcard.erixhens.com     # Base URL for cards
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Using PM2 (Recommended for production)
```bash
npm install -g pm2
pm2 start index.js --name smartvcard-api
pm2 startup
pm2 save
```

## API Endpoints

### Check Client ID Availability
```
GET /api/check-client/:clientId
```

Response:
```json
{
  "available": true,
  "clientId": "test-client-1",
  "url": "https://smartvcard.erixhens.com/test-client-1"
}
```

### Deploy Card
```
POST /api/deploy
```

Request body:
```json
{
  "clientId": "test-client-1",
  "html": "<html>...</html>",
  "css": "body {...}",
  "qrScript": "...",
  "vcard": "BEGIN:VCARD...",
  "images": {
    "logo": {
      "base64": "...",
      "ext": "png"
    }
  },
  "media": [
    {
      "filename": "video.mp4",
      "base64": "..."
    }
  ],
  "publicKey": "...",
  "fullName": "John Doe"
}
```

Response:
```json
{
  "success": true,
  "clientId": "test-client-1",
  "url": "https://smartvcard.erixhens.com/test-client-1",
  "message": "Card deployed successfully!"
}
```

### Update Card
```
PUT /api/deploy/:clientId
```

### Delete Card
```
DELETE /api/deploy/:clientId
```

### Health Check
```
GET /health
```

## File Structure

Deployed cards are organized as:

```
/var/www/vcards/
├── test-client-1/
│   ├── index.html
│   ├── style.min.css
│   ├── qrcode.min.js
│   ├── logo.png
│   ├── test-client-1.vcf
│   └── media/
│       └── video.mp4
├── another-client/
└── ...
```

## Caddy Configuration

The included `smartvcard.on` file configures:

1. API requests (`/api/*`) → Port 4646 (this server)
2. vCard paths (`/client-id`) → Static files from `/var/www/vcards/{client-id}`
3. Root path (`/`) → Port 3000 (Nuxt.js app)

## Security

- Client IDs are validated (alphanumeric, hyphens, underscores only)
- 50MB request size limit
- CORS enabled
- Security headers set by Caddy

## Troubleshooting

**Cards not loading:**
- Check file permissions: `ls -la /var/www/vcards/`
- Verify Caddy config: `caddy validate --config /etc/caddy/Caddyfile`
- Check API logs

**API not responding:**
- Verify server is running: `pm2 list` or `ps aux | grep node`
- Check port 4646 is not in use: `lsof -i :4646`
- Review logs: `pm2 logs smartvcard-api`

## Development

The server uses ES modules (`type: "module"`) and is compatible with Node.js 24's latest features.

Key dependencies:
- `express@^5.0.1` - Web framework with native async/await support
- `cors@^2.8.5` - CORS middleware

## License

Same as main project (AGPL-3.0)
