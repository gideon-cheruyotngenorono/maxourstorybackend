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
    const search = searchParams.get('search') || undefined;

    const users = await prisma.user.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: search ? {
        email: { contains: search, mode: 'insensitive' }
      } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        createdAt: true,
        isActive: true,
      }
    });

    let nextCursor: typeof cursor | null = null;
    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem!.id;
    }

    return NextResponse.json({ data: users, nextCursor }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_USERS_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
