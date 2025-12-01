import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(
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

    // Verify client is linked to this organization
    const clientProvider = await prisma.clientProvider.findUnique({
      where: {
        clientId_organizationId: {
          clientId,
          organizationId: organization.id,
        },
      },
    })

    if (!clientProvider) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get client details with company and products
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        createdAt: true,
        products: {
          where: {
            organizationId: organization.id,
          },
          select: {
            id: true,
            name: true,
            websiteUrl: true,
            productType: true,
            brandGuidelines: true,
            analysisData: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            tasks: {
              where: {
                organizationId: organization.id,
              },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching client details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client details' },
      { status: 500 }
    )
  }
}

