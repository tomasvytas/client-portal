import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId } = await params

    // Get user's organization
    const organization = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Remove client-provider link
    await prisma.clientProvider.deleteMany({
      where: {
        clientId,
        organizationId: organization.id,
      },
    })

    // Update subscription client count
    await prisma.subscription.update({
      where: { organizationId: organization.id },
      data: {
        clientCount: {
          decrement: 1,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error removing client:', error)
    return NextResponse.json(
      { error: 'Failed to remove client' },
      { status: 500 }
    )
  }
}

