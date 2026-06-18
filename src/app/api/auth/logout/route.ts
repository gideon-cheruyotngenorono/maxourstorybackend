import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { cookies } = require('next/headers');
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (refreshToken) {
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const prisma = require('@/lib/prisma').default;
      
      try {
        await prisma.refreshToken.update({
          where: { tokenHash },
          data: { revokedAt: new Date() }
        });
      } catch (e) {
        // Ignore errors if token doesn't exist
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    
    // Clear the http-only refresh token cookie
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[AUTH_LOGOUT]', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
  }
}
