import { NextRequest, NextResponse } from 'next/server'
import { requireMasterAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireMasterAdmin()

    const [
      totalOrganizations,
      totalClients,
      totalTasks,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.clientProvider.count(),
      prisma.task.count(),
      prisma.subscription.count({
        where: { status: 'active' },
      }),
    ])

    // Calculate total revenue (simplified - just count active subscriptions)
    // In a real scenario, you'd calculate based on actual payments
    const totalRevenue = activeSubscriptions * 50 // Placeholder

    return NextResponse.json({
      stats: {
        totalOrganizations,
        totalClients,
        totalTasks,
        activeSubscriptions,
        totalRevenue,
      },
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

