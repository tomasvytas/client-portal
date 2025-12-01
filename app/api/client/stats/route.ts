import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserOrganizationIds } from '@/lib/organization'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isMasterAdmin: true, companyName: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Determine role (master_admin takes precedence)
    const userRole = user.isMasterAdmin ? 'master_admin' : user.role

    // Get organization IDs for filtering
    const organizationIds = await getUserOrganizationIds(session.user.id, userRole)

    // Build where clause for tasks
    let whereClause: any = {}

    if (organizationIds === null) {
      // Master admin - see all tasks
      whereClause = {}
    } else if (organizationIds.length === 0) {
      // No organizations - return empty stats
      return NextResponse.json({
        stats: {
          totalTasks: 0,
          totalSpending: 0,
          companyName: user.companyName || null,
        },
      })
    } else {
      // Client - see only their own tasks from their organizations
      whereClause = {
        userId: session.user.id,
        organizationId: { in: organizationIds },
      }
    }

    // Get task count
    const totalTasks = await prisma.task.count({
      where: whereClause,
    })

    // Get tasks with prices to calculate spending
    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: {
        finalPrice: true,
        estimatedPrice: true,
      },
    })

    // Calculate total spending (use finalPrice if available, otherwise estimatedPrice)
    const totalSpending = tasks.reduce((sum, task) => {
      const price = task.finalPrice 
        ? parseFloat(task.finalPrice.toString())
        : task.estimatedPrice 
        ? parseFloat(task.estimatedPrice.toString())
        : 0
      return sum + price
    }, 0)

    return NextResponse.json({
      stats: {
        totalTasks,
        totalSpending,
        companyName: user.companyName || null,
      },
    })
  } catch (error: any) {
    console.error('Error fetching client stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

