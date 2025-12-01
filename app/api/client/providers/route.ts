import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || user.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all organizations the client is linked to
    const clientProviders = await prisma.clientProvider.findMany({
      where: { clientId: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    const providers = clientProviders.map(cp => ({
      id: cp.organization.id,
      name: cp.organization.name,
      slug: cp.organization.slug,
      owner: cp.organization.owner,
      joinedAt: cp.joinedAt.toISOString(),
    }))

    return NextResponse.json({ providers })
  } catch (error) {
    console.error('Error fetching providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || user.role !== 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inviteCode } = body

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Find organization by invite code
    const organization = await prisma.organization.findUnique({
      where: { inviteCode },
      include: {
        subscription: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      )
    }

    // Check if already linked
    const existingLink = await prisma.clientProvider.findUnique({
      where: {
        clientId_organizationId: {
          clientId: session.user.id,
          organizationId: organization.id,
        },
      },
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'You are already linked to this service provider' },
        { status: 400 }
      )
    }

    // Check subscription status
    if (!organization.subscription || organization.subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'This service provider\'s subscription is not active' },
        { status: 400 }
      )
    }

    // Link client to organization
    await prisma.clientProvider.create({
      data: {
        clientId: session.user.id,
        organizationId: organization.id,
      },
    })

    // Update client count
    await prisma.subscription.update({
      where: { organizationId: organization.id },
      data: {
        clientCount: {
          increment: 1,
        },
      },
    })

    return NextResponse.json({
      message: 'Successfully linked to service provider',
      provider: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    })
  } catch (error: any) {
    console.error('Error adding provider:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'You are already linked to this service provider' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to add provider' },
      { status: 500 }
    )
  }
}

