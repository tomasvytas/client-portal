import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const organization = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!organization) {
      return NextResponse.json({ clients: [] })
    }

    // Get all clients linked to this organization
    const clientProviders = await prisma.clientProvider.findMany({
      where: { organizationId: organization.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    // Format clients with task counts
    const clients = await Promise.all(
      clientProviders.map(async (cp) => {
        const taskCount = await prisma.task.count({
          where: {
            userId: cp.client.id,
            organizationId: organization.id,
          },
        })

        return {
          id: cp.client.id,
          name: cp.client.name,
          email: cp.client.email,
          joinedAt: cp.joinedAt.toISOString(),
          _count: {
            tasks: taskCount,
          },
        }
      })
    )

    return NextResponse.json({ clients })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

