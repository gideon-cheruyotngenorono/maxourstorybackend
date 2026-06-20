import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastToChannel } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { messageIds } = body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'messageIds array is required' }, { status: 400 });
    }

    // We can only mark messages sent BY THE PARTNER as read by ME.
    const messages = await prisma.message.findMany({
      where: {
        id: { in: messageIds },
        senderId: { not: userId } // Ensure I am not marking my own messages as read
      }
    });

    if (messages.length === 0) return NextResponse.json({ success: true, updatedCount: 0 }, { status: 200 });

    const coupleId = messages[0].coupleId;

    const receipts = await Promise.all(
      messages.map(msg => 
        prisma.messageReadReceipt.create({
          data: {
            messageId: msg.id,
            userId,
            readAt: new Date()
          }
        })
      )
    );

    // Update legacy isRead boolean or simply set status='READ' and readAt
    await prisma.message.updateMany({
      where: { id: { in: messageIds } },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });

    broadcastToChannel(`chat_${coupleId}`, 'read_receipt', { userId, messageIds: messages.map(m => m.id), readAt: new Date() });

    return NextResponse.json({ success: true, updatedCount: receipts.length }, { status: 200 });

  } catch (error: any) {
    console.error('[CHAT_READ_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
