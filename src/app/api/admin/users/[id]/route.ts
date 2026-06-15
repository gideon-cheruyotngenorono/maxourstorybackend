import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, logAdminAction } from '@/lib/adminAuth';
import bcrypt from 'bcrypt';
import { firebaseAdmin } from '@/lib/firebase';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        couplesAsPartnerA: true,
        couplesAsPartnerB: true,
        _count: {
          select: { messagesSent: true }
        }
      }
    });

    if (!user) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });

    // Aggregate couple status
    const couples = [...user.couplesAsPartnerA, ...user.couplesAsPartnerB];
    const activeCouple = couples.find(c => c.partnerAId && c.partnerBId);
    
    // Attempting to calculate last activity based on the most recent message or update
    const lastMessage = await prisma.message.findFirst({
      where: { senderId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    return NextResponse.json({ 
      data: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        coupleStatus: activeCouple ? 'active' : (couples.length > 0 ? 'pending' : 'none'),
        messageCount: user._count.messagesSent,
        lastActive: lastMessage?.createdAt || user.updatedAt
      } 
    }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_USER_GET]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await req.json();
    const { role, isActive } = body;

    const dataToUpdate: any = {};
    if (role && ['user', 'admin'].includes(role)) dataToUpdate.role = role;
    if (typeof isActive === 'boolean') dataToUpdate.isActive = isActive;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, role: true, isActive: true }
    });

    logAdminAction(auth.user.id, 'UPDATE_USER', 'User', id, dataToUpdate);

    return NextResponse.json({ data: updatedUser }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_USER_PATCH]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const { id } = await params;
    const adminId = auth.user.id;

    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Admin password is required to delete a user' } }, { status: 400 });
    }

    // Verify admin password
    const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
    if (!adminUser?.password) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Admin has no local password to verify' } }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, adminUser.password);
    if (!isValid) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Invalid admin password' } }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });

    // 1. Delete from Supabase auth.users
    try {
      await prisma.$executeRaw`DELETE FROM auth.users WHERE id = ${id}::uuid`;
    } catch (e) {
      console.warn('Failed to delete from supabase auth.users', e);
    }

    // 2. Delete from Firebase if applicable
    if (targetUser.googleId) {
      try {
        await firebaseAdmin.auth().deleteUser(targetUser.googleId);
      } catch (e) {
         console.warn('Failed to delete from firebase', e);
      }
    }

    // 3. Delete user natively (Cascade handles notes, chats, couple connections if set)
    await prisma.user.delete({ where: { id } });

    logAdminAction(adminId, 'DELETE_USER', 'User', id);

    return NextResponse.json({ message: 'User permanently deleted' }, { status: 200 });

  } catch (error: any) {
    console.error('[ADMIN_USER_DELETE]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
