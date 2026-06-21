import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { uploadFile } from '@/lib/supabase-storage'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const coupleId = formData.get('coupleId') as string
    const caption = formData.get('caption') as string || null
    const replyToId = formData.get('replyToId') as string || null

    if (!file || !coupleId) {
      return NextResponse.json(
        { error: 'File and coupleId are required' },
        { status: 400 }
      )
    }

    // Verify user is part of this couple
    const couple = await prisma.couple.findFirst({
      where: {
        id: coupleId,
        OR: [
          { partnerAId: userId },
          { partnerBId: userId },
        ],
      },
    })

    if (!couple) {
      return NextResponse.json(
        { error: 'Unauthorized: Not part of this couple' },
        { status: 403 }
      )
    }

    // Determine message type
    let type: any = 'FILE'
    if (file.type.startsWith('image/')) type = 'IMAGE'
    else if (file.type.startsWith('video/')) type = 'VIDEO'
    else if (file.type.startsWith('audio/')) type = 'AUDIO'

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Supabase Storage
    const timestamp = Date.now()
    const filePath = `${userId}/${coupleId}/${timestamp}_${file.name}`
    
    const { url } = await uploadFile(
      'chat-media',
      filePath,
      buffer,
      file.type
    )

    // Create message
    const message = await prisma.message.create({
      data: {
        coupleId,
        senderId: userId,
        content: caption,
        type,
        mediaUrl: url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        replyToId,
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

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error sending media message:', error)
    return NextResponse.json(
      { error: 'Failed to send media message' },
      { status: 500 }
    )
  }
}
