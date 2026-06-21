import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'changeme-jwt-secret-in-production'
);

// Simple memory rate limiter (per Edge instance)
const rateLimitMap = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = {
  '/api/auth/login': 5,
  '/api/auth/register': 5,
  '/api/auth/forgot-password': 3,
  '/api/ml-chat/send': 30, // 30 messages per minute
};

function checkRateLimit(ip: string, path: string): boolean {
  for (const [route, limit] of Object.entries(MAX_REQUESTS)) {
    if (path.startsWith(route)) {
      const key = `${ip}:${route}`;
      const now = Date.now();
      const timestamps = rateLimitMap.get(key) || [];
      const windowStart = now - WINDOW_MS;

      const currentWindow = timestamps.filter(t => t > windowStart);
      currentWindow.push(now);

      rateLimitMap.set(key, currentWindow);

      if (currentWindow.length > limit) {
        return false; // Rate limited
      }
      return true;
    }
  }
  return true; // No rate limit for this route
}

export async function proxy(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anon';
  const path = req.nextUrl.pathname;

  // ── CORS Headers ──────────────────────────────────────────────────────────
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-user-id, x-admin-key',
    'Access-Control-Max-Age': '86400', // cache preflight for 24 h
  };

  // Handle preflight OPTIONS request immediately — no auth needed
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // Rate limiting
  if (!checkRateLimit(ip, path)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: corsHeaders }
    );
  }

  // ── Protected routes: /api/ml-* and /api/user/* ──────────────────────────
  // Both require a valid Bearer JWT; userId is injected as x-user-id header.
  const isProtected =
    path.startsWith('/api/ml-') || 
    path.startsWith('/api/user/') ||
    path.startsWith('/api/messages') ||
    path.startsWith('/api/admin') ||
    path.startsWith('/api/upload');

  if (isProtected) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    try {
      const { payload } = await jwtVerify(token, secret);

      // Pass the userId to the route header
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-id', payload.userId as string);

      if (path.startsWith('/api/admin')) {
        const role = payload.role;
        // Optionally, if the role isn't in JWT, the route handler will check it via DB.
        // But if it is in JWT, we can block early.
        if (role && role !== 'admin') {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403, headers: corsHeaders }
          );
        }
      }

      const response = NextResponse.next({
        request: { headers: requestHeaders },
      });

      // Attach CORS headers to the forwarded request response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Token' },
        { status: 401, headers: corsHeaders }
      );
    }
  }

  // For all other routes, attach CORS headers and pass through
  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  // Match all /api/* routes so CORS + preflight is handled everywhere
  matcher: ['/api/:path*'],
};
