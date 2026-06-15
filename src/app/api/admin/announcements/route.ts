import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // e.g. "active"

    let whereClause: any = {};
    if (status === 'active') {
      whereClause.expiresAt = { gte: new Date() };
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { displayName: true } }
      }
    });

    return NextResponse.json({ data: announcements }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_ANNOUNCEMENTS_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
