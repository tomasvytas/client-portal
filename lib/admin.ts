import { auth } from './auth'
import { prisma } from './prisma'

export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.id) {
    return false
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isMasterAdmin: true },
  })

  // Service providers and master admins have admin access
  return user?.role === 'service_provider' || user?.isMasterAdmin === true || user?.role === 'admin'
}

export async function isMasterAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.id) {
    return false
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isMasterAdmin: true },
  })

  return user?.isMasterAdmin === true
}

export async function isServiceProvider(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.id) {
    return false
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  return user?.role === 'service_provider'
}

export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error('Unauthorized: Admin access required')
  }
  return true
}

export async function requireMasterAdmin() {
  const masterAdmin = await isMasterAdmin()
  if (!masterAdmin) {
    throw new Error('Unauthorized: Master admin access required')
  }
  return true
}
