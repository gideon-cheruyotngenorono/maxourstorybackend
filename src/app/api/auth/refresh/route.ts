import { NextResponse } from 'next/server';
import { verifyRefreshToken, signAccessToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token not found' }, { status: 401 });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 403 });
    }

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const dbToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!dbToken || dbToken.revokedAt) {
      return NextResponse.json({ error: 'Refresh token revoked or not found' }, { status: 403 });
    }

    const accessToken = signAccessToken({ userId: payload.userId });

    return NextResponse.json({ accessToken }, { status: 200 });
  } catch (error: any) {
    console.error('[AUTH_REFRESH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
