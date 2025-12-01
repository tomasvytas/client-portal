import { NextRequest, NextResponse } from 'next/server'
import { requireMasterAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireMasterAdmin()

    const organizations = await prisma.organization.findMany({
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
            clientCount: true,
            currentPeriodEnd: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            clientProviders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        owner: org.owner,
        subscription: org.subscription
          ? {
              plan: org.subscription.plan,
              status: org.subscription.status,
              clientCount: org.subscription.clientCount,
              currentPeriodEnd: org.subscription.currentPeriodEnd.toISOString(),
            }
          : null,
        _count: org._count,
        createdAt: org.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

