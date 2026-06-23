import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatUserWithAvatar } from '@/services/avatar';
import { getCoupleForUser } from '@/lib/couple-context';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const couple = await getCoupleForUser(userId);
    if (!couple) return NextResponse.json({ error: 'You are not in a couple' }, { status: 400 });

    const notes = await prisma.note.findMany({
      where: { coupleId: couple.id, isArchived: false },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: { creator: { select: { id: true, displayName: true, avatarUrl: true } } }
    });

    const formattedNotes = notes.map(note => {
      const { creator, ...rest } = note;
      return { ...rest, createdBy: formatUserWithAvatar(creator) };
    });

    return NextResponse.json({ notes: formattedNotes }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTES_LIST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
