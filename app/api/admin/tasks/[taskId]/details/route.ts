import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await requireAdmin()

    const { taskId } = await params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        assets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching task details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task details' },
      { status: 500 }
    )
  }
}

