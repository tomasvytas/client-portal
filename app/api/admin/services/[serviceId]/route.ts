import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    await requireAdmin()

    const { serviceId } = await params
    const body = await request.json()
    const { name, description, keywords, isActive } = body

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(keywords !== undefined && { keywords }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json({ service })
  } catch (error: any) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update service' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    await requireAdmin()

    const { serviceId } = await params

    await prisma.service.delete({
      where: { id: serviceId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting service:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete service' },
      { status: 500 }
    )
  }
}

