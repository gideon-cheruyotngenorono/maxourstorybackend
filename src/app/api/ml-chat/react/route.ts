import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastToChannel } from '@/lib/supabase';

const ALLOWED_EMOJIS = ['❤️', '🥰', '😂', '😭', '🙏', '👍'];

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'messageId and emoji are required' }, { status: 400 });
    }

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji. Please use a supported reaction.' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { couple: true }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Toggle reaction behavior (if same user reacts with same emoji, we could remove it, but let's just insert/update for simplicity, or delete if it already exists)
    const existingReaction = await prisma.messageReaction.findFirst({
      where: { messageId, userId, emoji }
    });

    let reaction;
    let actionType = 'add';
    
    if (existingReaction) {
      await prisma.messageReaction.delete({ where: { id: existingReaction.id } });
      actionType = 'remove';
    } else {
      reaction = await prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji
        }
      });
    }

    broadcastToChannel(`chat_${message.coupleId}`, 'reaction_update', { messageId, userId, emoji, action: actionType, reaction });

    return NextResponse.json({ success: true, action: actionType }, { status: 200 });

  } catch (error: any) {
    console.error('[CHAT_REACT_ERROR]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
