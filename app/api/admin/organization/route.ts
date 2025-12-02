import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isServiceProvider } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization (check if user owns an organization)
    const organization = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
      include: {
        subscription: {
          select: {
            plan: true,
            status: true,
            clientCount: true,
            currentPeriodEnd: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json({ organization: null })
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        serviceId: organization.serviceId,
        inviteCode: organization.inviteCode,
        inviteLink: organization.inviteLink,
        subscription: organization.subscription
          ? {
              plan: organization.subscription.plan,
              status: organization.subscription.status,
              clientCount: organization.subscription.clientCount,
              currentPeriodEnd: organization.subscription.currentPeriodEnd.toISOString(),
            }
          : null,
      },
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching organization:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

