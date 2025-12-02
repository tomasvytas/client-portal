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
      organizationsWithSubs,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.clientProvider.count(),
      prisma.task.count(),
      prisma.subscription.count({
        where: { status: 'active' },
      }),
      prisma.organization.findMany({
        where: {
          subscription: {
            status: 'active',
          },
        },
        include: {
          subscription: {
            select: {
              plan: true,
              clientCount: true,
            },
          },
        },
      }),
    ])

    // Calculate total revenue from all active subscriptions
    const calculateRevenue = (plan: string, clientCount: number) => {
      const basePrices: Record<string, number> = {
        '1_month': 50,
        '3_month': 35,
        '6_month': 25,
      }
      const clientFees: Record<string, number> = {
        '1_month': 10,
        '3_month': 8,
        '6_month': 7,
      }
      const basePrice = basePrices[plan] || 0
      const clientFee = clientFees[plan] || 0
      return basePrice + (clientCount * clientFee)
    }

    const totalRevenue = organizationsWithSubs.reduce((sum, org) => {
      if (org.subscription) {
        return sum + calculateRevenue(org.subscription.plan, org.subscription.clientCount)
      }
      return sum
    }, 0)

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

