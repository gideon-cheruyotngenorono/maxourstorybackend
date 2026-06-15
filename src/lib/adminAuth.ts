import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function requireAdmin(req: Request) {
  const userId = req.headers.get('x-user-id');
  
  if (!userId) {
    return { error: NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true }
  });

  if (!user || !user.isActive) {
    return { error: NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized or inactive user' } }, { status: 401 }) };
  }

  if (user.role !== 'admin') {
    return { error: NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin privileges required' } }, { status: 403 }) };
  }

  return { user };
}

export async function logAdminAction(adminId: string, action: string, targetType: string, targetId?: string, details?: any) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        details: details ? details : undefined
      }
    });
  } catch (error) {
    console.error('[ADMIN_AUDIT_LOG_ERROR]', error);
  }
}
