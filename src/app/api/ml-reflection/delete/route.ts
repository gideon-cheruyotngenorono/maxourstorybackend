import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { idSchema } from '@/validators/phase3';

// DELETE /api/ml-reflection/delete?id=<reflectionId>
// Only the owner of the reflection can delete it
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

    const reflection = await prisma.reflection.findUnique({ where: { id } });

    if (!reflection || reflection.userId !== userId) {
      return NextResponse.json({ error: 'Reflection not found or unauthorized' }, { status: 404 });
    }

    await prisma.reflection.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Reflection deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('[REFLECTION_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
