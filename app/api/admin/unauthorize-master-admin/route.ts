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

    // Remove master admin status (but keep their role if they're a service provider)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    // If they're a service provider, keep that role, otherwise set to client
    const newRole = user?.role === 'service_provider' ? 'service_provider' : 'client'

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

