import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import prisma from '@/lib/prisma'
import { supabaseStorage, uploadFile, getSignedUrl } from '@/lib/supabase-storage'
import {
  validateFile,
  processImage,
  generateFilename,
  getMessageType,
  UPLOAD_CONFIGS,
} from '@/lib/upload-utils'
import { getCoupleForUser } from '@/lib/couple-context'

// Helper to extract user ID from request
function getUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id') || null
}

// GET: Check upload status or get signed URL
export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')
    const action = searchParams.get('action')

    if (action === 'signed-url' && fileId) {
      // Get signed URL for private file
      const file = await prisma.mediaFile.findUnique({
        where: { id: fileId },
      })

      if (!file) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      // Extract bucket and path from URL
      const urlParts = file.url.split('/')
      const bucket = urlParts[urlParts.indexOf('object') + 2]
      const path = urlParts.slice(urlParts.indexOf('object') + 3).join('/')

      const signedUrl = await getSignedUrl(bucket, path, 3600)

      return NextResponse.json({ signedUrl })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// POST: Upload file
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = (formData.get('bucket') as string) || 'temp'
    let coupleId = formData.get('coupleId') as string || null
    const folder = formData.get('folder') as string || null
    const generateThumbnail = formData.get('generateThumbnail') === 'true'

    // Auto-detect coupleId from userId when not provided (for couple-scoped buckets)
    if (!coupleId && ['chat-media', 'timeline', 'letters'].includes(bucket)) {
      const couple = await getCoupleForUser(userId)
      if (!couple) {
        return NextResponse.json({ error: 'No couple found for this user' }, { status: 404 })
      }
      coupleId = couple.id
    }

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // Validate bucket
    const validBuckets = ['avatars', 'chat-media', 'timeline', 'letters', 'temp']
    if (!validBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: 'Invalid bucket' },
        { status: 400 }
      )
    }

    // For chat-media, timeline, letters - require coupleId
    if (['chat-media', 'timeline', 'letters'].includes(bucket) && !coupleId) {
      return NextResponse.json(
        { error: 'coupleId is required for this bucket' },
        { status: 400 }
      )
    }

    // Guard: Prevent uploads to communication buckets if couple is blocked
    if (['chat-media', 'timeline', 'letters'].includes(bucket) && coupleId) {
      const couple = await prisma.couple.findUnique({
        where: { id: coupleId },
        select: { isBlocked: true }
      });
      if (couple?.isBlocked) {
        return NextResponse.json(
          { error: 'Communication is currently blocked' },
          { status: 403 }
        )
      }
    }

    // For avatars - handled elsewhere
    if (bucket === 'avatars') {
      return NextResponse.json(
        { error: 'Use /api/avatar endpoint for avatar uploads' },
        { status: 400 }
      )
    }

    // Validate file
    const config = UPLOAD_CONFIGS[bucket as keyof typeof UPLOAD_CONFIGS]
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid bucket configuration' },
        { status: 400 }
      )
    }

    // Validate file type and size
    validateFile(file, bucket)

    // Generate path
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop() || 'file'
    const fileName = `${timestamp}_${uuidv4().slice(0, 8)}.${fileExt}`
    
    let filePath: string
    if (bucket === 'temp') {
      filePath = `${userId}/${fileName}`
    } else if (bucket === 'timeline' || bucket === 'letters') {
      filePath = `${coupleId}/${fileName}`
    } else if (bucket === 'chat-media') {
      filePath = `${userId}/${coupleId}/${fileName}`
    } else {
      filePath = `${folder || userId}/${fileName}`
    }

    // Process file based on type
    let uploadBuffer: Buffer = Buffer.from(await file.arrayBuffer())
    let uploadMimeType = file.type
    let thumbnailBuffer: Buffer | null = null
    let thumbnailMimeType: string | null = null

    // Process images
    if (file.type.startsWith('image/') && config.compressImage) {
      const processed = await processImage(uploadBuffer, file.type, {
        width: 1920,
        height: 1080,
        quality: 80,
        generateThumbnail: generateThumbnail || config.generateThumbnail,
      })
      
      uploadBuffer = processed.buffer
      uploadMimeType = processed.mimeType
      thumbnailBuffer = processed.thumbnail || null
      thumbnailMimeType = processed.thumbnailMimeType || null
    }

    // Upload main file
    const uploadResult = await uploadFile(
      bucket,
      filePath,
      uploadBuffer,
      uploadMimeType
    )

    // Upload thumbnail if generated
    let thumbnailUpload: { url: string; path: string } | null = null
    if (thumbnailBuffer && thumbnailMimeType) {
      const thumbPath = filePath.replace(/\.\w+$/, '_thumb.webp')
      thumbnailUpload = await uploadFile(
        bucket,
        thumbPath,
        thumbnailBuffer,
        thumbnailMimeType
      )
    }

    // Save to MediaFile table
    const mediaFile = await prisma.mediaFile.create({
      data: {
        url: uploadResult.url,
        type: uploadMimeType,
        size: uploadBuffer.length,
      },
    })

    // For chat-media, create message
    let message = null
    if (bucket === 'chat-media' && coupleId) {
      const messageType = getMessageType(uploadMimeType)
      
      message = await prisma.message.create({
        data: {
          coupleId,
          senderId: userId,
          content: (formData.get('caption') as string) || null,
          type: messageType,
          mediaUrl: uploadResult.url,
          thumbnailUrl: thumbnailUpload?.url || null,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          status: 'SENT',
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      })
    }

    // For timeline, create timeline event
    let timelineEvent = null
    if (bucket === 'timeline' && coupleId) {
      timelineEvent = await prisma.timelineEvent.create({
        data: {
          coupleId,
          userId,
          title: (formData.get('title') as string) || 'Timeline Event',
          description: (formData.get('description') as string) || null,
          date: new Date(),
          type: (formData.get('type') as string) || 'media',
          mediaUrl: uploadResult.url,
        },
      })
    }

    // For letters, update letter with attachment
    let letter = null
    if (bucket === 'letters' && coupleId) {
      const letterId = formData.get('letterId') as string
      if (letterId) {
        letter = await prisma.letter.update({
          where: { id: letterId },
          data: {
            content: `Attachment: ${file.name}\n\n${formData.get('content') || ''}`,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      file: {
        id: mediaFile.id,
        url: uploadResult.url,
        path: uploadResult.path,
        bucket,
        size: file.size,
        type: file.type,
        name: file.name,
      },
      thumbnail: thumbnailUpload ? {
        url: thumbnailUpload.url,
        path: thumbnailUpload.path,
      } : null,
      message,
      timelineEvent,
      letter,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    
    // Handle specific errors
    if (error.message && error.message.includes('File too large')) {
      return NextResponse.json(
        { error: error.message },
        { status: 413 }
      )
    }
    
    if (error.message && error.message.includes('type not allowed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 415 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
