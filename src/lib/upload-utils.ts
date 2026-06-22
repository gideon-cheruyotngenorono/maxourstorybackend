import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

// File validation
export interface UploadValidation {
  maxSize: number
  allowedTypes: string[]
  generateThumbnail?: boolean
  generatePreview?: boolean
  compressImage?: boolean
}

export const UPLOAD_CONFIGS: Record<string, UploadValidation> = {
  // Chat media
  'chat-media': {
    maxSize: 10485760, // 10MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
      'image/heic', 'image/heif',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 
      'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
      'audio/aac', 'audio/flac',
      'application/pdf', 'text/plain'
    ],
    generateThumbnail: true,
    compressImage: true,
  },
  
  // Timeline media
  'timeline': {
    maxSize: 20971520, // 20MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    ],
    generateThumbnail: true,
    compressImage: true,
  },
  
  // Letters attachments
  'letters': {
    maxSize: 10485760, // 10MB
    allowedTypes: [
      'application/pdf', 'image/jpeg', 'image/png', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    compressImage: true,
  },
  
  // Temp uploads
  'temp': {
    maxSize: 52428800, // 50MB
    allowedTypes: [], // Allow all
    generateThumbnail: false,
  },
}

// Validate file
export function validateFile(file: File, bucket: string) {
  const config = UPLOAD_CONFIGS[bucket as keyof typeof UPLOAD_CONFIGS]
  if (!config) {
    throw new Error('Invalid bucket')
  }

  // Check file size
  if (file.size > config.maxSize) {
    throw new Error(
      `File too large. Max size: ${config.maxSize / 1024 / 1024}MB`
    )
  }

  // Check file type
  if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(file.type)) {
    throw new Error(
      `File type not allowed. Allowed: ${config.allowedTypes.join(', ')}`
    )
  }

  return true
}

// Process image (compress, resize, generate thumbnail)
export async function processImage(
  buffer: Buffer,
  mimeType: string,
  options?: {
    width?: number
    height?: number
    quality?: number
    generateThumbnail?: boolean
  }
) {
  const { 
    width = 1920, 
    height = 1080, 
    quality = 80,
    generateThumbnail = false 
  } = options || {}

  let image = sharp(buffer)
  
  // Get metadata
  const metadata = await image.metadata()
  
  // Resize if needed
  if (metadata.width && metadata.width > width) {
    image = image.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  // Convert to WebP for better compression
  const processedBuffer = await image
    .webp({ quality })
    .toBuffer()

  let thumbnailBuffer: Buffer | null = null
  let thumbnailMimeType: string | null = null

  // Generate thumbnail
  if (generateThumbnail && metadata.width && metadata.height) {
    const thumbSize = Math.min(metadata.width, metadata.height, 200)
    thumbnailBuffer = await sharp(buffer)
      .resize(thumbSize, thumbSize, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 60 })
      .toBuffer()
    thumbnailMimeType = 'image/webp'
  }

  return {
    buffer: processedBuffer,
    mimeType: 'image/webp',
    width: metadata.width,
    height: metadata.height,
    thumbnail: thumbnailBuffer,
    thumbnailMimeType,
  }
}

// Generate unique filename
export function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || 'file'
  const timestamp = Date.now()
  const random = uuidv4().slice(0, 8)
  return `${timestamp}_${random}.${ext}`
}

// Get file extension
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

// Determine message type from file type
export function getMessageType(mimeType: string): any {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  return 'FILE'
}

// Format file size
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}
