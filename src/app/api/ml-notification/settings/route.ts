import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/ml-notification/settings  — Fetch push preferences
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let settings = await prisma.userNotificationSettings.findUnique({
      where: { userId },
    });

    // Create defaults on first access
    if (!settings) {
      settings = await prisma.userNotificationSettings.create({
        data: { userId },
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('[NOTIFICATION_SETTINGS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/ml-notification/settings  — Update push preferences
export async function PATCH(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pushEnabled, dailyReminder, chatNotifications, partnerActivity } = body;

    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        pushEnabled:        pushEnabled        ?? true,
        dailyReminder:      dailyReminder      ?? true,
        chatNotifications:  chatNotifications  ?? true,
        partnerActivity:    partnerActivity    ?? true,
      },
      update: {
        ...(pushEnabled        !== undefined && { pushEnabled }),
        ...(dailyReminder      !== undefined && { dailyReminder }),
        ...(chatNotifications  !== undefined && { chatNotifications }),
        ...(partnerActivity    !== undefined && { partnerActivity }),
      },
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('[NOTIFICATION_SETTINGS_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
