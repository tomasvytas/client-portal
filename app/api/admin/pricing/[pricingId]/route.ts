import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pricingId: string }> }
) {
  try {
    await requireAdmin()

    const { pricingId } = await params
    const body = await request.json()
    const { name, category, basePrice, minPrice, maxPrice, description, isActive } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (category) updateData.category = category
    if (basePrice !== undefined) updateData.basePrice = basePrice
    if (minPrice !== undefined) updateData.minPrice = minPrice
    if (maxPrice !== undefined) updateData.maxPrice = maxPrice
    if (description !== undefined) updateData.description = description
    if (isActive !== undefined) updateData.isActive = isActive

    const pricing = await prisma.pricing.update({
      where: { id: pricingId },
      data: updateData,
    })

    return NextResponse.json({ pricing })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating pricing:', error)
    return NextResponse.json(
      { error: 'Failed to update pricing' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pricingId: string }> }
) {
  try {
    await requireAdmin()

    const { pricingId } = await params
    await prisma.pricing.delete({
      where: { id: pricingId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting pricing:', error)
    return NextResponse.json(
      { error: 'Failed to delete pricing' },
      { status: 500 }
    )
  }
}

