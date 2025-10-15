import express from 'express'
import cors from 'cors'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4646

// Configuration
const VCARDS_DIR = process.env.VCARDS_DIR || '/var/www/vcards'
const BASE_URL = process.env.BASE_URL || 'https://smartvcards.erixhens.com'

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} - ${res.statusCode} [${duration}ms]`)
  })
  next()
})

// Validation utilities
const validators = {
  clientId: (clientId) => {
    // Only allow alphanumeric, hyphens, underscores and must start/end with alphanumeric
    const regex = /^[a-z0-9]([a-z0-9_-]{0,61}[a-z0-9])?$/i
    return regex.test(clientId) && clientId.length >= 3 && clientId.length <= 63
  },

  requiredFields: (obj, fields) => {
    const missing = fields.filter(field => !obj[field])
    return missing.length === 0 ? null : missing
  }
}

// File system utilities
const fileOps = {
  async exists(clientId) {
    try {
      const dirPath = path.join(VCARDS_DIR, clientId)
      await fs.access(dirPath)
      return true
    } catch {
      return false
    }
  },

  async saveFile(clientId, filename, content) {
    const dirPath = path.join(VCARDS_DIR, clientId)

    // Create directory if it doesn't exist
    await fs.mkdir(dirPath, { recursive: true })

    const filePath = path.join(dirPath, filename)

    // Handle base64 encoded files (images, media)
    if (typeof content === 'object' && content.base64) {
      const buffer = Buffer.from(content.base64, 'base64')
      await fs.writeFile(filePath, buffer)
    } else {
      await fs.writeFile(filePath, content, 'utf8')
    }

    return filePath
  },

  async deleteCard(clientId) {
    const dirPath = path.join(VCARDS_DIR, clientId)
    await fs.rm(dirPath, { recursive: true, force: true })
  }
}

// Caddy utilities
const caddy = {
  async reload() {
    try {
      await execAsync('caddy reload --config /etc/caddy/Caddyfile')
      return true
    } catch (error) {
      console.error('Caddy reload failed:', error.message)
      return false
    }
  }
}

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// API Routes

/**
 * GET /api/check-client/:clientId
 * Check if a client ID is available
 */
app.get('/api/check-client/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params

  if (!validators.clientId(clientId)) {
    return res.status(400).json({
      available: false,
      error: 'Invalid client ID format. Use only letters, numbers, hyphens, and underscores (3-63 characters)'
    })
  }

  const exists = await fileOps.exists(clientId)

  res.json({
    available: !exists,
    clientId,
    url: `${BASE_URL}/${clientId}`
  })
}))

/**
 * POST /api/deploy
 * Deploy a card to a path-based URL
 */
app.post('/api/deploy', asyncHandler(async (req, res) => {
  const { clientId, html, css, qrScript, vcard, images, media, publicKey, fullName } = req.body

  // Validate required fields
  const missing = validators.requiredFields(req.body, ['clientId', 'html'])
  if (missing) {
    return res.status(400).json({
      error: 'Missing required fields',
      missing
    })
  }

  // Validate client ID format
  if (!validators.clientId(clientId)) {
    return res.status(400).json({
      error: 'Invalid client ID format. Use only letters, numbers, hyphens, and underscores (3-63 characters)'
    })
  }

  // Check if client ID already exists
  const exists = await fileOps.exists(clientId)
  if (exists) {
    return res.status(409).json({
      error: 'This client ID is already taken. Please choose a different one.'
    })
  }

  // Create client directory
  const dirPath = path.join(VCARDS_DIR, clientId)
  await fs.mkdir(dirPath, { recursive: true })

  // Save main files
  await fileOps.saveFile(clientId, 'index.html', html)
  if (css) await fileOps.saveFile(clientId, 'style.min.css', css)
  if (qrScript) await fileOps.saveFile(clientId, 'qrcode.min.js', qrScript)
  if (vcard) await fileOps.saveFile(clientId, `${clientId}.vcf`, vcard)

  // Save public key with user's full name if provided
  if (publicKey) {
    const keyFilename = fullName
      ? `${fullName}'s public key.asc`
      : `${clientId}'s public key.asc`
    await fileOps.saveFile(clientId, keyFilename, publicKey)
  }

  // Save images
  if (images && typeof images === 'object') {
    for (const [key, imageData] of Object.entries(images)) {
      if (imageData?.base64 && imageData?.ext) {
        await fileOps.saveFile(clientId, `${key}.${imageData.ext}`, imageData)
      }
    }
  }

  // Save media files
  if (media && Array.isArray(media) && media.length > 0) {
    const mediaDir = path.join(dirPath, 'media')
    await fs.mkdir(mediaDir, { recursive: true })

    for (const item of media) {
      if (item.filename && item.base64) {
        const mediaPath = path.join('media', item.filename)
        await fileOps.saveFile(clientId, mediaPath, item)
      }
    }
  }

  res.json({
    success: true,
    clientId,
    url: `${BASE_URL}/${clientId}`,
    message: 'Card deployed successfully!'
  })
}))

/**
 * PUT /api/deploy/:clientId
 * Update an existing card
 */
app.put('/api/deploy/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params
  const { html, css, qrScript, vcard, images, media, publicKey, fullName } = req.body

  if (!validators.clientId(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' })
  }

  const exists = await fileOps.exists(clientId)
  if (!exists) {
    return res.status(404).json({ error: 'Client not found' })
  }

  // Update files
  if (html) await fileOps.saveFile(clientId, 'index.html', html)
  if (css) await fileOps.saveFile(clientId, 'style.min.css', css)
  if (qrScript) await fileOps.saveFile(clientId, 'qrcode.min.js', qrScript)
  if (vcard) await fileOps.saveFile(clientId, `${clientId}.vcf`, vcard)

  if (publicKey) {
    const keyFilename = fullName
      ? `${fullName}'s public key.asc`
      : `${clientId}'s public key.asc`
    await fileOps.saveFile(clientId, keyFilename, publicKey)
  }

  // Update images
  if (images && typeof images === 'object') {
    for (const [key, imageData] of Object.entries(images)) {
      if (imageData?.base64 && imageData?.ext) {
        await fileOps.saveFile(clientId, `${key}.${imageData.ext}`, imageData)
      }
    }
  }

  // Update media files
  if (media && Array.isArray(media) && media.length > 0) {
    const dirPath = path.join(VCARDS_DIR, clientId)
    const mediaDir = path.join(dirPath, 'media')
    await fs.mkdir(mediaDir, { recursive: true })

    for (const item of media) {
      if (item.filename && item.base64) {
        const mediaPath = path.join('media', item.filename)
        await fileOps.saveFile(clientId, mediaPath, item)
      }
    }
  }

  res.json({
    success: true,
    clientId,
    url: `${BASE_URL}/${clientId}`,
    message: 'Card updated successfully!'
  })
}))

/**
 * DELETE /api/deploy/:clientId
 * Delete/unpublish a card
 */
app.delete('/api/deploy/:clientId', asyncHandler(async (req, res) => {
  const { clientId } = req.params

  if (!validators.clientId(clientId)) {
    return res.status(400).json({ error: 'Invalid client ID' })
  }

  const exists = await fileOps.exists(clientId)
  if (!exists) {
    return res.status(404).json({ error: 'Client not found' })
  }

  await fileOps.deleteCard(clientId)

  res.json({
    success: true,
    message: 'Card unpublished successfully'
  })
}))

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    vcardsDir: VCARDS_DIR,
    baseUrl: BASE_URL
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 vCard Deployment API running on port ${PORT}`)
  console.log(`📁 Serving cards from: ${VCARDS_DIR}`)
  console.log(`🌐 Base URL: ${BASE_URL}`)
  console.log(`⚡ Node.js ${process.version}`)
})
