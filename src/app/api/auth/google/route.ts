import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    // Verify token with Google Auth Library (since Credential Manager issues Google ID tokens, not Firebase tokens)
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid Google Token' }, { status: 401 });
    }

    const email = payload.email;
    const googleId = payload.sub; // 'sub' is the unique Google user ID
    const name = payload.name || 'User';
    const picture = payload.picture || null;

    // Check if user exists (by Google ID or Email)
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create user if they don't exist
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          displayName: name || 'User',
          avatarUrl: picture,
          // Since password is now optional, we leave it null for Google-only users
        }
      });
    } else if (!user.googleId) {
      // User exists but has no googleId mapped, link them!
      // Also sync profile details if they are missing
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          googleId,
          avatarUrl: user.avatarUrl || picture,
          displayName: user.displayName || name
        }
      });
    }

    // Generate custom JWT tokens securely
    const accessToken = signAccessToken({ userId: user.id });
    const refreshToken = signRefreshToken({ userId: user.id });

    const cookieStore = await cookies();
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json({
      message: 'Google Login successful',
      user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
      accessToken,
    }, { status: 200 });

  } catch (error: any) {
    console.error('[AUTH_GOOGLE]', error);
    return NextResponse.json({ error: 'Google Verification failed' }, { status: 401 });
  }
}
