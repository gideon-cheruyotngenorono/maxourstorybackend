import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateContent } from '@/services/ai';

export async function GET(req: Request) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let topic = await prisma.dailyTopic.findUnique({
      where: { date: today }
    });

    if (!topic) {
      // Possible categories 
      const types = ["Romantic", "Faith", "Future", "Marriage", "Personal Growth"];
      const selectedType = types[Math.floor(Math.random() * types.length)];

      const prompt = `Generate a single deep, meaningful discussion question for a couple (Max and Leona) focused on the category: ${selectedType}. Only return the question itself, without any conversational filler or quotes.`;
      
      const question = await generateContent(prompt);
      
      topic = await prisma.dailyTopic.create({
        data: {
          content: `${selectedType}|${question || "What is a memory from our relationship that always makes you smile?"}`,
          date: today,
        }
      });
    }

    const parts = topic.content.split('|');
    const type = parts.length > 1 ? parts[0] : "Discussion";
    const question = parts.length > 1 ? parts[1] : topic.content;

    return NextResponse.json({ topic: { question, type, date: topic.date } }, { status: 200 });
  } catch (error: any) {
    console.error('[DISCUSSION_TODAY]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
