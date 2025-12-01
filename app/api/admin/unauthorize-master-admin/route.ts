import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireMasterAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is master admin
    await requireMasterAdmin()

    // Check if user owns an organization (is a service provider)
    const organization = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
      select: { id: true },
    })

    // If they own an organization, they're a service provider - keep that role
    // Otherwise, check their current role and preserve it if it's service_provider or admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    // Determine new role: if they have an organization, they're a service provider
    // Otherwise, if their role is service_provider or admin, keep it, else set to client
    let newRole = 'client'
    if (organization) {
      newRole = 'service_provider'
    } else if (user?.role === 'service_provider' || user?.role === 'admin') {
      newRole = user.role
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isMasterAdmin: false,
        role: newRole,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Master admin access removed',
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error unauthorizing master admin:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to unauthorize master admin' },
      { status: 500 }
    )
  }
}

