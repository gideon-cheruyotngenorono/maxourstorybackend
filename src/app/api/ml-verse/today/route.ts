import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateContent } from '@/services/ai';

export async function GET(req: Request) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to find if a verse was already generated for today
    let cachedVerse = await prisma.dailyVerse.findUnique({
      where: { date: today }
    });

    if (!cachedVerse) {
      // Generate a new verse using Gemini
      const prompt = `Provide an uplifting and romantic or family-oriented Bible verse from the WEB (World English Bible) translation suitable for a couple. Format the response exactly as: Reference|Verse Text`;
      
      const responseText = await generateContent(prompt);
      const parts = responseText.split('|');
      
      let content = "1 Corinthians 13:4-5|Love is patient and is kind; love doesn't envy. Love doesn't brag, is not proud, doesn't behave itself inappropriately, doesn't seek its own way, is not provoked,takes no account of evil;";
      
      if (parts.length >= 2) {
        content = `${parts[0].trim()}|${parts[1].trim()}`;
      } else if (responseText) {
        content = `Daily Verse|${responseText}`;
      }

      cachedVerse = await prisma.dailyVerse.create({
        data: {
          content,
          date: today,
        }
      });
    }

    // Split content to match response shape expected by front-end if needed
    // Assuming content is stored as "Reference|Text"
    const [reference, text] = cachedVerse.content.split('|');

    return NextResponse.json({ verse: { reference: reference || '', text: text || cachedVerse.content, version: 'WEB' } }, { status: 200 });
  } catch (error: any) {
    console.error('[VERSE_TODAY]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
