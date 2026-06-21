import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

// GET: Fetch messages
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const coupleId = searchParams.get('coupleId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit

    if (!coupleId) {
      return NextResponse.json(
        { error: 'coupleId is required' },
        { status: 400 }
      )
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
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: {
        coupleId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        reactions: true,
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    const total = await prisma.message.count({
      where: {
        coupleId,
        isDeleted: false,
      },
    })

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST: Send a message
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

    // Create message
    const message = await prisma.message.create({
      data: {
        coupleId,
        senderId: userId,
        content,
        type: type || 'TEXT',
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

    // TODO: Send real-time notification to partner
    // await notifyPartner(coupleId, message)

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
