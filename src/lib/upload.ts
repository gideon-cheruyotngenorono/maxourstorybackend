import prisma from './prisma'
import { supabaseStorage } from './supabase-storage'
import sharp from 'sharp'

// Upload avatar (separate from main upload)
export async function uploadAvatar(userId: string, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileExt = file.name.split('.').pop() || 'jpg'
  const filePath = `${userId}/avatar.${fileExt}`
  const fileType = file.type || 'image/jpeg'

  // Process image with sharp
  const processedBuffer = await sharp(buffer)
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer()

  const { error } = await supabaseStorage.storage
    .from('avatars')
    .upload(filePath, processedBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabaseStorage.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      avatarUrl: publicUrl,
      avatarPath: filePath,
    },
  })

  return { url: publicUrl, path: filePath }
}

// Upload chat media
export async function uploadChatMedia(
  userId: string,
  coupleId: string,
  file: File,
  caption?: string
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', 'chat-media')
  formData.append('coupleId', coupleId)
  if (caption) formData.append('caption', caption)
  formData.append('generateThumbnail', 'true')

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

// Upload timeline media
export async function uploadTimelineMedia(
  userId: string,
  coupleId: string,
  file: File,
  title: string,
  description?: string,
  type?: string
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', 'timeline')
  formData.append('coupleId', coupleId)
  formData.append('title', title)
  if (description) formData.append('description', description)
  if (type) formData.append('type', type)

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

// Upload letter attachment
export async function uploadLetterAttachment(
  userId: string,
  coupleId: string,
  letterId: string,
  file: File,
  content?: string
) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', 'letters')
  formData.append('coupleId', coupleId)
  formData.append('letterId', letterId)
  if (content) formData.append('content', content)

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

// Upload to temp (for previews, drafts, etc.)
export async function uploadTempFile(userId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', 'temp')

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/upload`, {
    method: 'POST',
    headers: {
      'x-user-id': userId,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

// Delete file
export async function deleteMediaFile(fileId: string) {
  const file = await prisma.mediaFile.findUnique({
    where: { id: fileId },
  })

  if (!file) {
    throw new Error('File not found')
  }

  // Extract bucket and path from URL
  const urlParts = file.url.split('/')
  const bucket = urlParts[urlParts.indexOf('object') + 2]
  const path = urlParts.slice(urlParts.indexOf('object') + 3).join('/')

  // Delete from storage
  const { error } = await supabaseStorage.storage
    .from(bucket)
    .remove([path])

  if (error) throw error

  // Delete from database
  await prisma.mediaFile.delete({
    where: { id: fileId },
  })

  return true
}
