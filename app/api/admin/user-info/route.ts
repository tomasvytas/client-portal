import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with organization and subscription
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isMasterAdmin: true,
        ownedOrganization: {
          include: {
            subscription: {
              select: {
                plan: true,
                status: true,
                clientCount: true,
                currentPeriodStart: true,
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
        },
        _count: {
          select: {
            tasks: true,
            products: true,
            clientProviders: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isMasterAdmin: user.isMasterAdmin,
        organization: user.ownedOrganization
          ? {
              id: user.ownedOrganization.id,
              name: user.ownedOrganization.name,
              inviteCode: user.ownedOrganization.inviteCode,
              inviteLink: user.ownedOrganization.inviteLink,
              subscription: user.ownedOrganization.subscription
                ? {
                    plan: user.ownedOrganization.subscription.plan,
                    status: user.ownedOrganization.subscription.status,
                    clientCount: user.ownedOrganization.subscription.clientCount,
                    currentPeriodStart: user.ownedOrganization.subscription.currentPeriodStart.toISOString(),
                    currentPeriodEnd: user.ownedOrganization.subscription.currentPeriodEnd.toISOString(),
                  }
                : null,
              _count: {
                tasks: user.ownedOrganization._count.tasks,
                clients: user.ownedOrganization._count.clientProviders,
              },
            }
          : null,
        _count: {
          tasks: user._count.tasks,
          products: user._count.products,
          clients: user._count.clientProviders,
        },
      },
    })
  } catch (error: any) {
    console.error('Error fetching user info:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch user info' },
      { status: 500 }
    )
  }
}

