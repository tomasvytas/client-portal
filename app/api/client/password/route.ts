import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Find user's credentials account
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'credentials',
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'No password account found. You may be using Google OAuth.' },
        { status: 400 }
      )
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      currentPassword,
      account.refresh_token || ''
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password (stored in refresh_token field)
    await prisma.account.update({
      where: { id: account.id },
      data: {
        refresh_token: hashedPassword,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error: any) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to change password' },
      { status: 500 }
    )
  }
}

