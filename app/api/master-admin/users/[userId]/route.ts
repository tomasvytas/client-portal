import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireMasterAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireMasterAdmin()

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    // Prevent deleting yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get user to check if they exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        ownedOrganization: {
          select: { id: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({
      success: true,
      message: `User ${user.email} has been deleted`,
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}

