import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const coupleId = searchParams.get('coupleId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!q || q.trim() === '') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId is required' }, { status: 400 });
    }

    // Verify user is in couple
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId }
    });

    if (!couple || (couple.partnerAId !== userId && couple.partnerBId !== userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        coupleId,
        content: {
          contains: q,
          mode: 'insensitive'
        },
        isDeleted: false
      },
      include: {
        sender: { select: { displayName: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.message.count({
      where: {
        coupleId,
        content: {
          contains: q,
          mode: 'insensitive'
        },
        isDeleted: false
      }
    });

    return NextResponse.json({ success: true, data: messages, pagination: { total, page, limit } }, { status: 200 });

  } catch (error: any) {
    console.error('[CHAT_SEARCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
