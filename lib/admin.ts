import { auth } from './auth'
import { prisma } from './prisma'

export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.id) {
    return false
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  return user?.role === 'admin'
}

export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error('Unauthorized: Admin access required')
  }
  return true
}
