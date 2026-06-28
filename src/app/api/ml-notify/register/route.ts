import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const registerSchema = z.object({
  fcmToken: z.string().min(1, 'FCM Token is required'),
});

// POST /api/ml-notify/register — Register an FCM token (primary token on user record)
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { fcmToken } = parsed.data;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    return NextResponse.json({ success: true, user: { id: user.id } }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTIFY_REGISTER]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/ml-notify/register
// Unregisters the user's primary FCM token so they stop receiving push notifications.
// Call this on logout.
export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });

    return NextResponse.json({ success: true, message: 'Push token unregistered' }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTIFY_UNREGISTER]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
