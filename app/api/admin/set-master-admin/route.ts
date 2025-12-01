import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Only allow current admins to set master admin (for security)
    await requireAdmin()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user to master admin
    await prisma.user.update({
      where: { email },
      data: {
        isMasterAdmin: true,
        role: 'master_admin',
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully set ${email} as master admin`,
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error setting master admin:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to set master admin' },
      { status: 500 }
    )
  }
}

