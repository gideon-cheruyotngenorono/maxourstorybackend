import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { idSchema } from '@/validators/phase3';

// DELETE /api/ml-letter/delete?id=<letterId>
// Only the author can delete their own letter/draft
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const parsed = idSchema.safeParse({ id: searchParams.get('id') });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id } = parsed.data;

    const letter = await prisma.letter.findUnique({ where: { id } });

    if (!letter || letter.authorId !== userId) {
      return NextResponse.json({ error: 'Letter not found or unauthorized' }, { status: 404 });
    }

    await prisma.letter.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Letter deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('[LETTER_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
