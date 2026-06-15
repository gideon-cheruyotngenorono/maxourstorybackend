import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, logAdminAction } from '@/lib/adminAuth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { id } = await params;

    const couple = await prisma.couple.findUnique({
      where: { id },
      include: {
        partnerA: { select: { displayName: true, email: true } },
        partnerB: { select: { displayName: true, email: true } },
        _count: {
          select: {
            jarReasons: true,
            notes: true,
            prayers: true,
            messages: true,
          }
        }
      }
    });

    if (!couple) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Couple not found' } }, { status: 404 });

    const lastMessage = await prisma.message.findFirst({
      where: { coupleId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    return NextResponse.json({
      data: {
        id: couple.id,
        partnerA: couple.partnerA,
        partnerB: couple.partnerB,
        anniversaryDate: couple.anniversaryDate,
        createdAt: couple.createdAt,
        stats: couple._count,
        lastActivity: lastMessage?.createdAt || couple.createdAt
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_COUPLE_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { id } = await params;

    const couple = await prisma.couple.findUnique({ where: { id } });
    if (!couple) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Couple not found' } }, { status: 404 });

    // Send notifications
    const partners = [couple.partnerAId, couple.partnerBId].filter(Boolean) as string[];
    const notifications = partners.map(partnerId => ({
      userId: partnerId,
      type: 'COUPLE_DISSOLVED_BY_ADMIN',
      title: 'Couple Connection Removed',
      body: 'Your couple connection has been removed by platform administrators.',
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    // Force dissolve
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { coupleId: couple.id } }),
      prisma.note.deleteMany({ where: { coupleId: couple.id } }),
      prisma.jarReason.deleteMany({ where: { coupleId: couple.id } }),
      prisma.prayer.deleteMany({ where: { coupleId: couple.id } }),
      prisma.reflection.deleteMany({ where: { coupleId: couple.id } }),
      prisma.timelineEvent.deleteMany({ where: { coupleId: couple.id } }),
      prisma.letter.deleteMany({ where: { coupleId: couple.id } }),
      prisma.gratitudeEntry.deleteMany({ where: { coupleId: couple.id } }),
      prisma.coupleFavoriteVerse.deleteMany({ where: { coupleId: couple.id } }),
      prisma.couple.delete({ where: { id: couple.id } })
    ]);

    logAdminAction(auth.user.id, 'DELETE_COUPLE', 'Couple', id);

    return NextResponse.json({ message: 'Couple successfully dissolved and data redacted' }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_COUPLE_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
