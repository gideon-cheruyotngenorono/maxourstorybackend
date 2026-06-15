import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, logAdminAction } from '@/lib/adminAuth';

export async function DELETE(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { type, id } = await params;
    const adminId = auth.user.id;

    let deleted = false;

    if (type === 'message') {
      await prisma.message.delete({ where: { id } });
      deleted = true;
    } else if (type === 'note') {
      await prisma.note.delete({ where: { id } });
      deleted = true;
    } else if (type === 'jar_entry') {
      await prisma.jarReason.delete({ where: { id } });
      deleted = true;
    } else if (type === 'prayer') {
      await prisma.prayer.delete({ where: { id } });
      deleted = true;
    } else {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Unknown content type' } }, { status: 400 });
    }

    if (deleted) {
      logAdminAction(adminId, 'DELETE_CONTENT', type, id);
    }

    return NextResponse.json({ message: `${type} content deleted successfully` }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_CONTENT_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error or content not found' } }, { status: 500 });
  }
}
