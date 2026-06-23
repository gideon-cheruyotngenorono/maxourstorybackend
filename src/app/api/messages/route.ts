import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { broadcastToChannel } from '@/lib/supabase'
import { dispatchNotification } from '@/services/notification'

// GET: Fetch messages (cursor-based pagination for infinite scroll)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    // cursor-based pagination: pass the oldest message id you have to get older ones
    const cursor = searchParams.get('cursor') // message id to paginate from

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId is required' }, { status: 400 })
    }

    // Verify user is part of this couple or is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    const isAdmin = user?.role === 'admin'

    if (!isAdmin) {
      const couple = await prisma.couple.findFirst({
        where: {
          id: coupleId,
          OR: [{ partnerAId: userId }, { partnerBId: userId }],
        },
      })
      if (!couple) {
        return NextResponse.json(
          { error: 'Unauthorized: Not part of this couple' },
          { status: 403 }
        )
      }
    }

    // Cursor-based keyset pagination (much more efficient than OFFSET for chat history)
    const messages = await prisma.message.findMany({
      where: {
        coupleId,
        isDeleted: false,
        ...(cursor
          ? {
              createdAt: {
                lt: (await prisma.message.findUnique({ where: { id: cursor }, select: { createdAt: true } }))?.createdAt,
              },
            }
          : {}),
      },
      include: {
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        reactions: {
          select: { id: true, userId: true, emoji: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            sender: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Oldest message id becomes the next cursor for loading older history
    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

    return NextResponse.json({
      messages,
      nextCursor,
      hasMore: nextCursor !== null,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST: Send a text message
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { coupleId, content, type, replyToId } = body

    if (!coupleId || !content) {
      return NextResponse.json(
        { error: 'coupleId and content are required' },
        { status: 400 }
      )
    }

    // Verify user is part of this couple
    const couple = await prisma.couple.findFirst({
      where: {
        id: coupleId,
        OR: [{ partnerAId: userId }, { partnerBId: userId }],
      },
    })

    if (!couple) {
      return NextResponse.json(
        { error: 'Unauthorized: Not part of this couple' },
        { status: 403 }
      )
    }

    if (couple.isBlocked) {
      return NextResponse.json(
        { error: 'Communication is currently blocked' },
        { status: 403 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        coupleId,
        senderId: userId,
        content,
        type: type || 'TEXT',
        replyToId: replyToId || null,
        status: 'SENT',
      },
      include: {
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    })

    // Fire realtime broadcast so partner receives message instantly
    broadcastToChannel(`chat_${coupleId}`, 'new_message', { message })

    // Send FCM push notification to partner (fire-and-forget)
    const recipientId =
      couple.partnerAId === userId ? couple.partnerBId : couple.partnerAId
    if (recipientId) {
      const senderName = message.sender?.displayName || 'Your partner'
      dispatchNotification({
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: `💬 ${senderName}`,
        body: (content as string).slice(0, 80),
        data: {
          coupleId,
          messageId: message.id,
          screen: 'Chat',
        },
      })
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
