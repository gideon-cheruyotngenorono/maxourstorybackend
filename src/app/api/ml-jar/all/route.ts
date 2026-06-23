import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCoupleForUser } from '@/lib/couple-context';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });

    const couple = await getCoupleForUser(userId);
    if (!couple) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Couple connection not found' } }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const items = await prisma.jarReason.findMany({
      where: { coupleId: couple.id },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { displayName: true } } }
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    return NextResponse.json({ data: items, nextCursor }, { status: 200 });
  } catch (error: any) {
    console.error('[JAR_ALL_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
