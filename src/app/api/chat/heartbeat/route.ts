import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { broadcastToChannel } from '@/lib/supabase'

/**
 * POST /api/chat/heartbeat
 *
 * Called periodically by the client (e.g. every 30s) while the chat is open.
 * Updates `User.updatedAt` to serve as a lastSeen timestamp, and broadcasts
 * an `online` presence event to the partner.
 *
 * The frontend can infer "online" by checking if lastSeen < 60 seconds ago.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Stamp the user's updatedAt as a lastSeen proxy
    const user = await prisma.user.update({
      where: { id: userId },
      data: { updatedAt: new Date() },
      select: { id: true, displayName: true, updatedAt: true },
    })

    // Broadcast online status to partner channel (fire-and-forget)
    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] },
      select: { id: true },
    })

    if (couple) {
      broadcastToChannel(`chat_${couple.id}`, 'presence', {
        userId,
        type: 'online',
        isActive: true,
        lastSeen: user.updatedAt.toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      lastSeen: user.updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error('[HEARTBEAT_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/chat/heartbeat?partnerId=xxx
 *
 * Checks if the given user was seen within the last 60 seconds.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const partnerId = searchParams.get('partnerId')

    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId is required' }, { status: 400 })
    }

    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, displayName: true, updatedAt: true },
    })

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    const lastSeenMs = Date.now() - new Date(partner.updatedAt).getTime()
    const isOnline = lastSeenMs < 60_000 // within 60 seconds

    return NextResponse.json({
      partnerId: partner.id,
      displayName: partner.displayName,
      isOnline,
      lastSeen: partner.updatedAt.toISOString(),
      lastSeenSeconds: Math.floor(lastSeenMs / 1000),
    })
  } catch (error: any) {
    console.error('[HEARTBEAT_GET_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
