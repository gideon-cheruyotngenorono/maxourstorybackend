import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { jarReasonSchema } from '@/validators/phase4';
import { getCoupleForUser } from '@/lib/couple-context';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const couple = await getCoupleForUser(userId);
    if (!couple) return NextResponse.json({ error: 'You are not in a couple' }, { status: 400 });

    const body = await req.json();
    const parsed = jarReasonSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const { content, category } = parsed.data;
    const reason = await prisma.jarReason.create({
      data: { coupleId: couple.id, creatorId: userId, content, category },
    });

    return NextResponse.json({ reason }, { status: 201 });
  } catch (error: any) {
    console.error('[JAR_ADD]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
