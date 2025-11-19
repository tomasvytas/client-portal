import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const tasks = await prisma.task.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
            assets: true,
          },
        },
      },
    })

    return NextResponse.json({ tasks })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

