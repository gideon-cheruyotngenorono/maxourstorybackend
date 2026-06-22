import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/ml-couple/partner-email
 *
 * Auto-detects the partner's email from the current user's couple.
 * Useful for inviting / verifying partner before joining a couple.
 * Also returns the full couple profile for convenience.
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] },
      include: {
        partnerA: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
        partnerB: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
      },
    })

    if (!couple) {
      return NextResponse.json({ error: 'No couple found for this user' }, { status: 404 })
    }

    // Figure out which one is the partner (not the current user)
    const isPartnerA = couple.partnerAId === userId
    const me = isPartnerA ? couple.partnerA : couple.partnerB
    const partner = isPartnerA ? couple.partnerB : couple.partnerA

    if (!partner) {
      return NextResponse.json({
        coupleId: couple.id,
        inviteCode: couple.inviteCode,
        me,
        partner: null,
        message: 'No partner has joined yet.',
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
