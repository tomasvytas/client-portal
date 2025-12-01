import { prisma } from './prisma'

/**
 * Get user's organization IDs
 * - For clients: returns array of organization IDs they're linked to
 * - For service providers: returns array with their owned organization ID
 * - For master admin: returns null (can see all)
 */
export async function getUserOrganizationIds(userId: string, userRole: string): Promise<string[] | null> {
  // Master admin can see everything
  if (userRole === 'master_admin') {
    return null
  }

  // Service provider - get their owned organization
  if (userRole === 'service_provider') {
    const org = await prisma.organization.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    })
    return org ? [org.id] : []
  }

  // Client - get all organizations they're linked to
  if (userRole === 'client') {
    const clientProviders = await prisma.clientProvider.findMany({
      where: { clientId: userId },
      select: { organizationId: true },
    })
    return clientProviders.map(cp => cp.organizationId)
  }

  return []
}

/**
 * Get the primary organization ID for a client (first one they joined)
 * Used when creating new tasks
 */
export async function getClientPrimaryOrganizationId(userId: string): Promise<string | null> {
  const clientProvider = await prisma.clientProvider.findFirst({
    where: { clientId: userId },
    orderBy: { joinedAt: 'asc' },
    select: { organizationId: true },
  })
  return clientProvider?.organizationId || null
}

