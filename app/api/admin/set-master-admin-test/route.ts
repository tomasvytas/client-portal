import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Special endpoint for testing account to enable admin access
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow for testing account
    if (session.user.email !== 'tv.vytas@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    // Verify it's the same email
    if (email !== 'tv.vytas@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
      message: `Successfully set ${email} as admin`,
    })
  } catch (error: any) {
    console.error('Error setting admin:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to set admin' },
      { status: 500 }
    )
  }
}

