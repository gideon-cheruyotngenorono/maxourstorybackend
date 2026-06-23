import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure the token hash is provided to revoke the specific session
    let tokenHash: string | undefined;
    try {
      const body = await req.json();
      tokenHash = body.refreshToken;
    } catch (e) {
      // Ignored
    }

    if (!tokenHash) {
      return NextResponse.json({ error: 'Refresh token is required to logout' }, { status: 400 });
    }

    // Delete the specific token for the user
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        tokenHash,
      }
    });

    return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[AUTH_LOGOUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
