import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { loginSchema } from '@/validators/auth';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.password) {
      // User signed up with Google but tried to login with email/password
      return NextResponse.json({ error: 'Please sign in with Google' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      }
    });

    return NextResponse.json(
      {
        message: 'Login successful',
        user: { id: user.id, email: user.email, displayName: user.displayName },
        accessToken,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[AUTH_LOGIN]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
