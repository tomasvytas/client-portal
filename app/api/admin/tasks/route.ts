import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin, isMasterAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if master admin
    const masterAdmin = await isMasterAdmin()

    // Build where clause
    let whereClause: any = {}

    if (!masterAdmin) {
      // Service provider - only see tasks from their organization
      const organization = await prisma.organization.findUnique({
        where: { ownerId: session.user.id },
        select: { id: true },
      })

      if (!organization) {
        return NextResponse.json({ tasks: [] })
      }

      whereClause.organizationId = organization.id
    }
    // Master admin sees all tasks (no where clause)

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
            assets: true,
          },
        },
      },
    })

    return NextResponse.json({ tasks })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

