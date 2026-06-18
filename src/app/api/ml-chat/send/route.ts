import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
import { dispatchNotification } from '@/services/notification';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const couple = await prisma.couple.findFirst({
      where: { OR: [{ partnerAId: userId }, { partnerBId: userId }] }
    });

    if (!couple) return NextResponse.json({ error: 'Couple not found' }, { status: 404 });

    const body = await req.json();
    const { type, content, mediaUrl, fileName, fileSize, duration } = body;

    if (!type || !['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'SYSTEM'].includes(type)) {
      return NextResponse.json({ error: 'Invalid or missing type' }, { status: 400 });
    }

    if (type === 'TEXT' && (!content || content.trim() === '')) {
      return NextResponse.json({ error: 'Content is required for TEXT messages' }, { status: 400 });
    }

    if (type !== 'TEXT' && type !== 'SYSTEM' && !mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required for media messages' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        coupleId: couple.id,
        senderId: userId,
        type,
        content: content || null,
        mediaUrl: mediaUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        duration: duration || null,
      },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } }
      }
    });

    // Fire realtime event via Supabase
    const channelName = `chat_${couple.id}`;
    supabase.channel(channelName).send({
      type: 'broadcast',
      event: 'new_message',
      payload: { message }
    });

    // Determine recipient (the other partner) and send FCM push
    const recipientId = couple.partnerAId === userId ? couple.partnerBId : couple.partnerAId;
    if (recipientId) {
      const senderName = message.sender?.displayName || 'Your partner';
      const preview = type === 'TEXT'
        ? (content?.slice(0, 60) || '')
        : `Sent a ${type.toLowerCase()}`;

      dispatchNotification({
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: `💬 ${senderName}`,
        body: preview,
        data: {
          coupleId: couple.id,
          messageId: message.id,
          screen: 'Chat',
        },
      }); // fire-and-forget — don't await so send response stays fast
    }

    return NextResponse.json({ success: true, message }, { status: 200 });

  } catch (error: any) {
    console.error('[CHAT_SEND_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
