import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isAdmin } from '@/lib/admin'

// GET: List all couples (admin only)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const couples = await prisma.couple.findMany({
      include: {
        partnerA: {
          select: { email: true, displayName: true }
        },
        partnerB: {
          select: { email: true, displayName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(couples)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch couples' },
      { status: 500 }
    )
  }
}
