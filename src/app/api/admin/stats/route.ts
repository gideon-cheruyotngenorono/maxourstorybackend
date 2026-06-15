import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Concurrent queries for speed
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalCouples,
      activeCouples, // Using "where partnerA and partnerB exist"
      totalMessages,
      totalJars,
      totalNotes,
      totalPrayers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { updatedAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.couple.count(),
      prisma.couple.count({ where: { partnerAId: { not: '' }, partnerBId: { not: null } } }),
      prisma.message.count(),
      prisma.jarReason.count(),
      prisma.note.count(),
      prisma.prayer.count()
    ]);

    // Daily activity chart data (User registrations over 30 days as an example)
    // For full cross-entity activity, we log message creation over 30 days
    const recentMessages = await prisma.message.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true }
    });

    const activityByDate: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      activityByDate[dateStr] = 0; // Initialize 0
    }

    recentMessages.forEach(msg => {
      const dateStr = msg.createdAt.toISOString().split('T')[0];
      if (activityByDate[dateStr] !== undefined) {
        activityByDate[dateStr]++;
      }
    });

    const chartData = Object.keys(activityByDate).map(date => ({
      date,
      count: activityByDate[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      data: {
        users: { total: totalUsers, active7d: activeUsers, new30d: newUsers },
        couples: { total: totalCouples, active: activeCouples },
        content: { messages: totalMessages, jars: totalJars, notes: totalNotes, prayers: totalPrayers },
        chartData
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_STATS_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
