import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { broadcastToChannel } from '@/lib/supabase'
import { dispatchNotification } from '@/services/notification'
import { getCoupleForUser, getPartnerId } from '@/lib/couple-context'

// GET: Fetch messages (cursor-based pagination)
// coupleId is OPTIONAL — omit it and the backend detects your couple automatically
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const cursor = searchParams.get('cursor')

    // coupleId is optional in the query — auto-detect from userId if omitted
    let coupleId = searchParams.get('coupleId')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, coupleId: true }
    })
    const isAdmin = user?.role === 'admin'

    if (!coupleId) {
      // Auto-detect: use cached coupleId from user record
      if (!user?.coupleId) {
        const couple = await getCoupleForUser(userId)
        if (!couple) return NextResponse.json({ error: 'No couple found for this user' }, { status: 404 })
        coupleId = couple.id
      } else {
        coupleId = user.coupleId
      }
    }

    if (!isAdmin) {
      // Verify they actually belong to this couple
      const belongs = await prisma.couple.findFirst({
        where: {
          id: coupleId,
          OR: [{ partnerAId: userId }, { partnerBId: userId }]
        }
      })
      if (!belongs) return NextResponse.json({ error: 'Unauthorized: Not part of this couple' }, { status: 403 })
    }

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
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
        reactions: { select: { id: true, userId: true, emoji: true } },
        replyTo: {
          select: {
            id: true, content: true, type: true,
            sender: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

    return NextResponse.json({ messages, nextCursor, hasMore: nextCursor !== null })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST: Send a text message
// coupleId is OPTIONAL in the body — auto-detected from userId if omitted
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { content, type, replyToId } = body

    if (!content) return NextResponse.json({ error: 'content is required' }, { status: 400 })

    // Auto-detect couple — coupleId in body is optional
    let couple = null
    if (body.coupleId) {
      // They passed it explicitly — verify membership
      couple = await prisma.couple.findFirst({
        where: { id: body.coupleId, OR: [{ partnerAId: userId }, { partnerBId: userId }] }
      })
    } else {
      // Auto-detect from userId
      couple = await getCoupleForUser(userId)
    }

    if (!couple) return NextResponse.json({ error: 'No couple found for this user' }, { status: 404 })

    if (couple.isBlocked) {
      return NextResponse.json({ error: 'Communication is currently blocked' }, { status: 403 })
    }

    const message = await prisma.message.create({
      data: {
        coupleId: couple.id,
        senderId: userId,
        content,
        type: type || 'TEXT',
        replyToId: replyToId || null,
        status: 'SENT',
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    })

    // Broadcast to partner via Supabase Realtime
    broadcastToChannel(`chat_${couple.id}`, 'new_message', { message })

    // Push notification to partner
    const recipientId = getPartnerId(couple, userId)
    if (recipientId) {
      const senderName = message.sender?.displayName || 'Your partner'
      dispatchNotification({
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: `💬 ${senderName}`,
        body: (content as string).slice(0, 80),
        data: { coupleId: couple.id, messageId: message.id, screen: 'Chat' },
      })
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
