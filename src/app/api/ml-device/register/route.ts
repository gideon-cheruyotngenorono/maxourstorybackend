import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  fcmToken: z.string().min(1, 'FCM Token is required'),
});

// POST /api/ml-device/register — Register or update a device push token
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { platform, deviceName, fcmToken } = body;

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

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

// DELETE /api/ml-device/register?fcmToken=<token>  OR  ?deviceId=<id>
// Unregisters a device so it no longer receives push notifications.
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fcmToken = searchParams.get('fcmToken');
    const deviceId = searchParams.get('deviceId');

    if (!fcmToken && !deviceId) {
      return NextResponse.json({ error: 'Provide fcmToken or deviceId query parameter' }, { status: 400 });
    }

    let device;

    if (deviceId) {
      device = await prisma.device.findFirst({ where: { id: deviceId, userId } });
    } else {
      device = await prisma.device.findFirst({ where: { fcmToken: fcmToken!, userId } });
    }

    if (!device) {
      return NextResponse.json({ error: 'Device not found or unauthorized' }, { status: 404 });
    }

    await prisma.device.delete({ where: { id: device.id } });

    // If this device's token matches the user's primary FCM token, clear it
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (user?.fcmToken && user.fcmToken === device.fcmToken) {
      // Find another device to promote, or clear the token entirely
      const nextDevice = await prisma.device.findFirst({
        where: { userId, fcmToken: { not: null } },
        orderBy: { lastSeen: 'desc' },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken: nextDevice?.fcmToken ?? null },
      });
    }

    return NextResponse.json({ success: true, message: 'Device unregistered' }, { status: 200 });
  } catch (error: any) {
    console.error('[DEVICE_UNREGISTER_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
