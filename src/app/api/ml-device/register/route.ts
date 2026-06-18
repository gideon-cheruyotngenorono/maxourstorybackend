import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { platform, deviceName, fcmToken } = body;

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    // Check if device already exists with this FCM token or name (upsert logic based on FCM or create)
    // If fcmToken is provided, we might want to update the existing one
    let device;

    if (fcmToken) {
      const existing = await prisma.device.findFirst({
        where: { userId, fcmToken }
      });
      if (existing) {
        device = await prisma.device.update({
          where: { id: existing.id },
          data: { lastSeen: new Date(), deviceName, platform }
        });
      } else {
        device = await prisma.device.create({
          data: { userId, platform, deviceName, fcmToken }
        });
      }

      // Also update the User's primary FCM token to maintain compatibility
      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken }
      });

    } else {
      device = await prisma.device.create({
        data: { userId, platform, deviceName }
      });
    }

    return NextResponse.json({ success: true, device }, { status: 200 });

  } catch (error: any) {
    console.error('[DEVICE_REGISTER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
