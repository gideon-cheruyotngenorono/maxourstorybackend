import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuditLogs, isAdmin } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const logs = await getAdminAuditLogs(userId)
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
