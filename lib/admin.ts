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

  // Only actual admins and master admins have admin access (NOT service providers)
  return user?.isMasterAdmin === true || user?.role === 'admin'
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

/**
 * Require admin or service provider access
 * Service providers have limited access (only their own organization)
 * Admins have full access
 */
export async function requireAdminOrServiceProvider() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized: Authentication required')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isMasterAdmin: true },
  })

  if (!user) {
    throw new Error('Unauthorized: User not found')
  }

  // Allow admins, master admins, and service providers
  const hasAccess = user.isMasterAdmin === true || user.role === 'admin' || user.role === 'service_provider'
  
  if (!hasAccess) {
    throw new Error('Unauthorized: Admin or Service Provider access required')
  }
  
  return {
    isAdmin: user.isMasterAdmin === true || user.role === 'admin',
    isServiceProvider: user.role === 'service_provider',
    userId: session.user.id,
  }
}

export async function requireMasterAdmin() {
  const masterAdmin = await isMasterAdmin()
  if (!masterAdmin) {
    throw new Error('Unauthorized: Master admin access required')
  }
  return true
}
