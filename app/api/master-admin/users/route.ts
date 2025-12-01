import { NextRequest, NextResponse } from 'next/server'
import { requireMasterAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireMasterAdmin()

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isMasterAdmin: true,
        createdAt: true,
        ownedOrganization: {
          select: {
            id: true,
            name: true,
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isMasterAdmin: user.isMasterAdmin,
        organization: user.ownedOrganization,
        _count: user._count,
        createdAt: user.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

