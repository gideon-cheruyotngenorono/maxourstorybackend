import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isAdmin, promoteToAdmin, demoteFromAdmin } from '@/lib/admin'

// GET: List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST: Promote or demote user
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, email } = body

    if (!action || !email) {
      return NextResponse.json(
        { error: 'action and email are required' },
        { status: 400 }
      )
    }

    let result
    if (action === 'promote') {
      result = await promoteToAdmin(userId, email)
    } else if (action === 'demote') {
      result = await demoteFromAdmin(userId, email)
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "promote" or "demote"' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}
