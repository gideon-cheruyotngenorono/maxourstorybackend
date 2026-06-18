import * as admin from 'firebase-admin';
import prisma from '@/lib/prisma';

// Ensure Firebase Admin is initialized once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('[FIREBASE] Admin init error:', error);
  }
}

export type NotificationType =
  | 'NEW_MESSAGE'
  | 'MESSAGE_REACTION'
  | 'PARTNER_ONLINE'
  | 'NEW_NOTE'
  | 'NEW_LETTER'
  | 'NEW_PRAYER'
  | 'ANNIVERSARY_REMINDER'
  | 'DAILY_VERSE'
  | 'DAILY_TOPIC'
  | 'SYSTEM';

export interface NotificationPayload {
  userId: string;            // recipient
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>; // extra key/value pairs sent to the Android app
  saveToDb?: boolean;        // default true — persist to Notification table
}

/**
 * All-in-one notification dispatcher.
 * 1) Saves a record to the Notification table (history)
 * 2) Reads every FCM token registered for that user
 * 3) Sends a multicast FCM push to all their devices
 * 4) Prunes any stale / invalid tokens automatically
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  const { userId, type, title, body, data = {}, saveToDb = true } = payload;

  // 1 — Persist to DB so the notification history endpoint works
  if (saveToDb) {
    try {
      await prisma.notification.create({
        data: { userId, type, title, body },
      });
    } catch (err) {
      console.error('[NOTIFICATION] DB insert error:', err);
    }
  }

  // 2 — Check the user's notification settings (respect opt-out)
  try {
    const settings = await prisma.userNotificationSettings.findUnique({
      where: { userId },
    });

    if (settings) {
      if (!settings.pushEnabled) return;
      if (type === 'NEW_MESSAGE' && !settings.chatNotifications) return;
      if (
        (type === 'PARTNER_ONLINE' || type === 'MESSAGE_REACTION') &&
        !settings.partnerActivity
      )
        return;
      if (
        (type === 'DAILY_VERSE' || type === 'DAILY_TOPIC' || type === 'ANNIVERSARY_REMINDER') &&
        !settings.dailyReminder
      )
        return;
    }
  } catch (err) {
    // If settings row doesn't exist, proceed with sending
    console.warn('[NOTIFICATION] Could not fetch user settings, proceeding anyway');
  }

  // 3 — Collect FCM tokens: primary from User + all registered Devices
  const fcmTokens = new Set<string>();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });
  if (user?.fcmToken) fcmTokens.add(user.fcmToken);

  const devices = await prisma.device.findMany({
    where: { userId, fcmToken: { not: null } },
    select: { fcmToken: true },
  });
  devices.forEach((d) => {
    if (d.fcmToken) fcmTokens.add(d.fcmToken);
  });

  if (fcmTokens.size === 0) return; // no tokens, nothing to push

  // 4 — Send multicast FCM push
  const tokens = Array.from(fcmTokens);

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title, body },
    data: {
      type,
      ...data,
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'our_story_default', // must match Android channel ID
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    // 5 — Prune invalid / unregistered tokens
    const staleTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          staleTokens.push(tokens[idx]);
        }
      }
    });

    if (staleTokens.length > 0) {
      // Remove stale token from User record
      await prisma.user.updateMany({
        where: { fcmToken: { in: staleTokens } },
        data: { fcmToken: null },
      });
      // Remove stale tokens from Device records
      await prisma.device.updateMany({
        where: { fcmToken: { in: staleTokens } },
        data: { fcmToken: null },
      });
      console.log(`[NOTIFICATION] Pruned ${staleTokens.length} stale FCM token(s)`);
    }

    console.log(
      `[NOTIFICATION] Sent to ${response.successCount}/${tokens.length} device(s) for user ${userId}`
    );
  } catch (err) {
    console.error('[NOTIFICATION] FCM send error:', err);
  }
}
