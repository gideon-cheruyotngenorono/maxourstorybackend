import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/ml-notification/history  — Paginated notification history for the user
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[NOTIFICATION_HISTORY]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/ml-notification/history  — Mark one or all notifications as read
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      const { count } = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, updatedCount: count });
    }

    if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Provide notificationId or markAllRead:true' }, { status: 400 });
  } catch (error) {
    console.error('[NOTIFICATION_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ml-notification/history?id=<notificationId>  — delete one notification
// DELETE /api/ml-notification/history                       — clear ALL notifications for the user
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      // Delete a specific notification (must belong to this user)
      const notification = await prisma.notification.findFirst({ where: { id, userId } });
      if (!notification) {
        return NextResponse.json({ error: 'Notification not found or unauthorized' }, { status: 404 });
      }
      await prisma.notification.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Notification deleted' }, { status: 200 });
    }

    // No id — clear ALL notifications for this user
    const { count } = await prisma.notification.deleteMany({ where: { userId } });
    return NextResponse.json({ success: true, message: `Cleared ${count} notification(s)` }, { status: 200 });
  } catch (error) {
    console.error('[NOTIFICATION_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
