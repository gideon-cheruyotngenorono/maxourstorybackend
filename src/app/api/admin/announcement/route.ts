import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, logAdminAction } from '@/lib/adminAuth';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const body = await req.json();
    const { title, message, priority, expiresAt } = body;

    if (!title || !message || !expiresAt) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Missing required fields' } }, { status: 400 });
    }

    const dateExpiry = new Date(expiresAt);

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        priority: priority || 'low',
        expiresAt: dateExpiry,
        createdById: auth.user.id
      }
    });

    logAdminAction(auth.user.id, 'CREATE_ANNOUNCEMENT', 'Announcement', announcement.id);

    return NextResponse.json({ data: announcement }, { status: 201 });

  } catch (error: any) {
    console.error('[ADMIN_ANNOUNCEMENT_POST]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
