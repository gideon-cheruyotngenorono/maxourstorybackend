import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const couples = await prisma.couple.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        partnerA: { select: { displayName: true } },
        partnerB: { select: { displayName: true } },
      }
    });

    let nextCursor: typeof cursor | null = null;
    if (couples.length > limit) {
      const nextItem = couples.pop();
      nextCursor = nextItem!.id;
    }

    const mappedCouples = couples.map(couple => {
      const referenceDate = couple.anniversaryDate || couple.createdAt;
      const diffTime = Math.abs(new Date().getTime() - new Date(referenceDate).getTime());
      const daysTogether = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const status = couple.partnerAId && couple.partnerBId ? 'active' : 'pending';

      return {
        id: couple.id,
        partnerAName: couple.partnerA.displayName,
        partnerBName: couple.partnerB?.displayName || null,
        daysTogether,
        status,
        createdAt: couple.createdAt,
      };
    });

    return NextResponse.json({ data: mappedCouples, nextCursor }, { status: 200 });
  } catch (error: any) {
    console.error('[ADMIN_COUPLES_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
