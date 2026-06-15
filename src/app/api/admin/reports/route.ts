import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') || 'pending';

    const reports = await prisma.contentReport.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' }
    });

    let nextCursor: typeof cursor | null = null;
    if (reports.length > limit) {
      const nextItem = reports.pop();
      nextCursor = nextItem!.id;
    }

    // Usually we would join 'reporter' but the Prisma schema for ContentReport doesn't have a linked relation to User yet
    // I will dynamically fetch reporter info because it is a raw String field.
    const reporterIds = reports.map(r => r.reporterId);
    const users = await prisma.user.findMany({
      where: { id: { in: reporterIds } },
      select: { id: true, displayName: true, email: true }
    });
    
    const userMap = users.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {} as Record<string, any>);

    const mappedReports = reports.map(r => ({
      ...r,
      reporter: userMap[r.reporterId] || null
    }));

    return NextResponse.json({ data: mappedReports, nextCursor }, { status: 200 });
  } catch (error: any) {
    console.error('[ADMIN_REPORTS_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
