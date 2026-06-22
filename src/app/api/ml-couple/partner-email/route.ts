import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/ml-couple/partner-email
 *
 * Auto-detects the partner's email from the current user's couple.
 * Uses denormalized coupleId for fast lookup, falls back to OR scan for legacy users.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fast path: use coupleId stored on user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coupleId: true }
    })

    let couple = null

    if (user?.coupleId) {
      couple = await prisma.couple.findUnique({
        where: { id: user.coupleId },
        include: {
          partnerA: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
          partnerB: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
        },
      })
    }

    // Fallback: OR scan (handles legacy users without coupleId)
    if (!couple) {
      couple = await prisma.couple.findFirst({
        where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] },
        include: {
          partnerA: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
          partnerB: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
        },
      })

      // Backfill coupleId for next call
      if (couple) {
        prisma.user.update({
          where: { id: userId },
          data: { coupleId: couple.id }
        }).catch(() => {}) // non-fatal
      }
    }

    if (!couple) {
      return NextResponse.json({ error: 'No couple found for this user' }, { status: 404 })
    }

    // Figure out which is the partner (not the current user)
    const isPartnerA = couple.partnerAId === userId
    const me = isPartnerA ? couple.partnerA : couple.partnerB
    const partner = isPartnerA ? couple.partnerB : couple.partnerA

    if (!partner) {
      return NextResponse.json({
        coupleId: couple.id,
        inviteCode: couple.inviteCode,
        me,
        partner: null,
        message: 'No partner has joined yet. Share your invite code!',
      })
    }

    return NextResponse.json({
      coupleId: couple.id,
      me,
      partner: {
        id: partner.id,
        email: partner.email,
        displayName: partner.displayName,
        avatarUrl: partner.avatarUrl,
      },
    })
  } catch (error: any) {
    console.error('[PARTNER_EMAIL_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
