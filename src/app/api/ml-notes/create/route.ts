import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { noteSchema } from '@/validators/phase3';
import { getCoupleForUser } from '@/lib/couple-context';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const couple = await getCoupleForUser(userId);
    if (!couple) return NextResponse.json({ error: 'You are not in a couple' }, { status: 400 });

    const body = await req.json();
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const note = await prisma.note.create({
      data: { coupleId: couple.id, creatorId: userId, ...parsed.data },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error: any) {
    console.error('[NOTES_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
