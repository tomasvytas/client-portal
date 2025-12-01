import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyName } = body

    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Update user's company name
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { companyName: companyName.trim() },
      select: { companyName: true },
    })

    return NextResponse.json({
      success: true,
      companyName: user.companyName,
    })
  } catch (error: any) {
    console.error('Error updating company name:', error)
    return NextResponse.json(
      { error: 'Failed to update company name' },
      { status: 500 }
    )
  }
}

