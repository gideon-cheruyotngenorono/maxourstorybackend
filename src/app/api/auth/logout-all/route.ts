import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Delete all refresh tokens to kill all active sessions
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });

    // 2. Clear out device records to stop push notifications to outdated sessions
    await prisma.device.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ message: 'Successfully logged out from all devices' }, { status: 200 });

  } catch (error: any) {
    console.error('[AUTH_LOGOUT_ALL]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
