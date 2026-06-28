import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE /api/ml-bedtime/log?id=<timelineEventId>
// Clears a specific bedtime ritual completion log entry.
// Only a member of the couple that owns the event can delete it.
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const event = await prisma.timelineEvent.findUnique({ where: { id } });

    if (!event) {
      return NextResponse.json({ error: 'Bedtime log entry not found' }, { status: 404 });
    }

    // Verify the requesting user belongs to the couple that owns this event
    const couple = await prisma.couple.findFirst({
      where: {
        id: event.coupleId,
        OR: [{ partnerAId: userId }, { partnerBId: userId }],
      },
    });

    if (!couple) {
      return NextResponse.json({ error: 'Unauthorized: Not part of this couple' }, { status: 403 });
    }

    // Only allow deleting bedtime ritual entries, not arbitrary timeline events
    if (!event.title?.includes('Bedtime Ritual')) {
      return NextResponse.json({ error: 'This endpoint only removes bedtime ritual entries' }, { status: 400 });
    }

    await prisma.timelineEvent.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Bedtime log entry removed' }, { status: 200 });
  } catch (error: any) {
    console.error('[BEDTIME_LOG_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
