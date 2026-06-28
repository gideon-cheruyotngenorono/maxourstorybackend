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

  // ── AVATARS ─────────────────────────────────────────────────────────────────
  'avatars': {
    maxSize: 10485760, // 10MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'image/heic', 'image/heif', 'image/avif',
    ],
    compressImage: true,
    generateThumbnail: false,
  },

  // ── CHAT-MEDIA ───────────────────────────────────────────────────────────────
  'chat-media': {
    maxSize: 52428800, // 50MB (videos can be large)
    allowedTypes: [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'image/heic', 'image/heif', 'image/avif',
      'image/bmp', 'image/tiff', 'image/x-tiff',
      // Videos
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'video/webm', 'video/ogg', 'video/mpeg',
      'video/3gpp', 'video/3gpp2', 'video/x-m4v',
      'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv',
      'video/x-ms-asf',
      // Audio
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
      'audio/aac', 'audio/flac', 'audio/x-m4a',
      'audio/amr', 'audio/opus', 'audio/x-wav',
      'audio/x-flac', 'audio/x-aiff', 'audio/x-ms-wma',
      'audio/midi', 'audio/x-midi',
      // Documents
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/rtf', 'text/rtf',
    ],
    generateThumbnail: true,
    compressImage: true,
  },

  // ── TIMELINE ─────────────────────────────────────────────────────────────────
  'timeline': {
    maxSize: 52428800, // 50MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', 'image/avif', 'image/svg+xml',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/ogg',
      'video/3gpp', 'video/3gpp2', 'video/x-m4v', 'video/mpeg',
    ],
    generateThumbnail: true,
    compressImage: true,
  },

  // ── LETTERS ──────────────────────────────────────────────────────────────────
  'letters': {
    maxSize: 20971520, // 20MB
    allowedTypes: [
      // Documents
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/rtf', 'application/rtf',
      // Apple iWork
      'application/vnd.apple.pages', 'application/vnd.apple.numbers',
      'application/vnd.apple.keynote', 'application/x-iwork-pages',
      'application/x-iwork-numbers', 'application/x-iwork-keynote',
      // OpenDocument
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
      // Images (for embedded photos in letters)
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    ],
    compressImage: true,
    generateThumbnail: false,
  },

  // ── TEMP ─────────────────────────────────────────────────────────────────────
  'temp': {
    maxSize: 52428800, // 50MB
    allowedTypes: [], // NULL in Supabase — allow all
    generateThumbnail: false,
  },
}

// Extension → MIME fallback map for when the client sends no/wrong MIME type
const EXT_MIME_MAP: Record<string, string> = {
  // Images
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  avif: 'image/avif', svg: 'image/svg+xml', bmp: 'image/bmp',
  tiff: 'image/tiff', tif: 'image/tiff',
  // Videos
  mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
  webm: 'video/webm', ogg: 'video/ogg', mpg: 'video/mpeg', mpeg: 'video/mpeg',
  '3gp': 'video/3gpp', '3gpp': 'video/3gpp', '3g2': 'video/3gpp2',
  m4v: 'video/x-m4v', mkv: 'video/x-matroska',
  flv: 'video/x-flv', wmv: 'video/x-ms-wmv',
  // Audio
  mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac',
  flac: 'audio/flac', m4a: 'audio/x-m4a', aiff: 'audio/x-aiff',
  aif: 'audio/x-aiff', amr: 'audio/amr', opus: 'audio/opus',
  wma: 'audio/x-ms-wma', mid: 'audio/midi', midi: 'audio/midi',
  // Documents
  pdf: 'application/pdf', txt: 'text/plain', rtf: 'application/rtf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pages: 'application/vnd.apple.pages',
  numbers: 'application/vnd.apple.numbers',
  key: 'application/vnd.apple.keynote',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
}

// Validate file — resolves MIME from extension if file.type is empty
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

  // Resolve effective MIME type — fallback to extension sniff if client sent nothing
  let effectiveMime = file.type
  if (!effectiveMime) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    effectiveMime = EXT_MIME_MAP[ext] || ''
  }

  // Check file type
  if (config.allowedTypes.length > 0 && !config.allowedTypes.includes(effectiveMime)) {
    throw new Error(
      `File type not allowed. Received: "${effectiveMime || 'unknown'}". Allowed: ${config.allowedTypes.join(', ')}`
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
