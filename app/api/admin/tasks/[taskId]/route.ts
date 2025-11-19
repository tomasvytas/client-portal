import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await requireAdmin()

    const { taskId } = await params
    const body = await request.json()
    const { status, finalPrice } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (finalPrice !== undefined) updateData.finalPrice = finalPrice

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    })

    return NextResponse.json({ task })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

