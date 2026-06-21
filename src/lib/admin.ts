import prisma from './prisma'

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  
  return user?.role === 'admin'
}

export async function requireAdmin(userId: string) {
  if (!await isAdmin(userId)) {
    throw new Error('Unauthorized: Admin access required')
  }
}

export async function getAdminAuditLogs(adminId: string, limit: number = 100) {
  await requireAdmin(adminId)
  
  return prisma.adminAuditLog.findMany({
    where: { adminId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      admin: {
        select: {
          email: true,
          displayName: true,
        },
      },
    },
  })
}

export async function promoteToAdmin(adminId: string, targetEmail: string) {
  await requireAdmin(adminId)
  
  return prisma.user.update({
    where: { email: targetEmail },
    data: { role: 'admin' },
  })
}

export async function demoteFromAdmin(adminId: string, targetEmail: string) {
  await requireAdmin(adminId)
  
  // Check if this is the last admin
  const adminCount = await prisma.user.count({
    where: { role: 'admin' },
  })
  
  if (adminCount <= 1) {
    throw new Error('Cannot demote the last admin')
  }
  
  return prisma.user.update({
    where: { email: targetEmail },
    data: { role: 'user' },
  })
}
