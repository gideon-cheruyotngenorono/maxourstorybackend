import { NextRequest, NextResponse } from 'next/server'
import { broadcastToChannel } from '@/lib/supabase'
import prisma from '@/lib/prisma'

/**
 * POST /api/chat/presence
 *
 * Broadcasts ephemeral presence events (typing, recording, online, offline)
 * directly via Supabase Realtime broadcast. NOTHING is written to the database.
 *
 * Body:
 *   type: "typing" | "recording" | "online" | "offline"
 *   isActive: boolean  (true = started, false = stopped)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { type, isActive } = body

    const validTypes = ['typing', 'recording', 'online', 'offline']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Look up the couple to get the channel name
    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] },
      select: { id: true, partnerAId: true, partnerBId: true },
    })

    if (!couple) {
      return NextResponse.json({ error: 'No couple found for this user' }, { status: 404 })
    }

    // Broadcast presence event — ephemeral, no DB hit
    await broadcastToChannel(`chat_${couple.id}`, 'presence', {
      userId,
      type,
      isActive: isActive !== false, // default true
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, broadcasted: type })
  } catch (error: any) {
    console.error('[PRESENCE_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
