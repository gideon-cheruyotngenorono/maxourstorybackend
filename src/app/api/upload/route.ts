import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/supabase-storage'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'temp'
    const folder = formData.get('folder') as string || userId

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

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const filePath = `${folder}/${timestamp}_${file.name}`

    const result = await uploadFile(bucket, filePath, buffer, file.type)

    // If uploading avatar, update user record
    if (bucket === 'avatars') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: result.url,
          avatarPath: result.path,
        },
      })
    }

    // Save to MediaFile table
    await prisma.mediaFile.create({
      data: {
        url: result.url,
        type: file.type,
        size: file.size,
      },
    })

    return NextResponse.json({
      url: result.url,
      path: result.path,
      bucket,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
