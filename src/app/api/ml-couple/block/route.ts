import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coupleId: true }
    });

    if (!user || !user.coupleId) {
      return NextResponse.json({ error: 'No couple found for this user' }, { status: 404 });
    }

    const couple = await prisma.couple.findUnique({
      where: { id: user.coupleId }
    });

    if (!couple) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 });
    }

    if (couple.isBlocked) {
      return NextResponse.json({ error: 'Couple is already blocked' }, { status: 400 });
    }

    const updatedCouple = await prisma.couple.update({
      where: { id: couple.id },
      data: {
        isBlocked: true,
        blockedById: userId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Partner has been blocked successfully',
      couple: updatedCouple
    }, { status: 200 });

  } catch (error: any) {
    console.error('[COUPLE_BLOCK]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
