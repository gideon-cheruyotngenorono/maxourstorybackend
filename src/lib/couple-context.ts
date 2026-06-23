/**
 * couple-context.ts
 *
 * Centralised helper that resolves a user's couple from just their userId.
 *
 * Strategy:
 *  1. Fast path  — read the denormalized `coupleId` column on the User row.
 *  2. Fallback   — OR-scan the Couple table (handles legacy / pre-migration users).
 *  3. Backfill   — when fallback succeeds, stamp coupleId on the User row so
 *                  the next call is instant.
 *
 * Usage:
 *   const couple = await getCoupleForUser(userId)
 *   if (!couple) return NextResponse.json({ error: 'No couple found' }, { status: 404 })
 */

import prisma from '@/lib/prisma'
import type { Couple } from '@prisma/client'

// ─── Core helper ──────────────────────────────────────────────────────────────

export async function getCoupleForUser(userId: string): Promise<Couple | null> {
  // 1. Fast path: read cached coupleId from User row (single indexed lookup)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true }
  })

  if (user?.coupleId) {
    const couple = await prisma.couple.findUnique({
      where: { id: user.coupleId }
    })
    if (couple) return couple
  }

  // 2. Fallback: OR-scan Couple table (for legacy users without coupleId stamped)
  const couple = await prisma.couple.findFirst({
    where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
  })

  // 3. Backfill: stamp the coupleId so the next call is instant (fire-and-forget)
  if (couple) {
    prisma.user.update({
      where: { id: userId },
      data: { coupleId: couple.id }
    }).catch(() => { /* non-fatal */ })
  }

  return couple
}

/**
 * Resolves a couple and returns a 403 guard if it is blocked.
 */
export async function getCoupleOrBlock(userId: string) {
  const couple = await getCoupleForUser(userId)

  if (!couple) {
    return { couple: null, blocked: false, notFound: true }
  }

  if (couple.isBlocked) {
    return { couple, blocked: true, notFound: false }
  }

  return { couple, blocked: false, notFound: false }
}

/**
 * Returns the partner's userId from the couple, given the current user's ID.
 */
export function getPartnerId(couple: Couple, userId: string): string | null {
  return couple.partnerAId === userId ? couple.partnerBId : couple.partnerAId
}
