import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { gratitudeSchema } from '@/validators/phase4';
import { getCoupleForUser } from '@/lib/couple-context';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const couple = await getCoupleForUser(userId);
    if (!couple) return NextResponse.json({ error: 'You are not in a couple' }, { status: 400 });

    const body = await req.json();
    const parsed = gratitudeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { content, date, isShared } = parsed.data;
    const entry = await prisma.gratitudeEntry.create({
      data: { coupleId: couple.id, userId, content, date: new Date(date), isShared },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error: any) {
    console.error('[GRATITUDE_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
