import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const pricings = await prisma.pricing.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ pricings })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching pricings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { name, category, basePrice, minPrice, maxPrice, description, isActive } = body

    if (!name || !category || basePrice === undefined) {
      return NextResponse.json(
        { error: 'Name, category, and basePrice are required' },
        { status: 400 }
      )
    }

    const pricing = await prisma.pricing.create({
      data: {
        name,
        category,
        basePrice,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json({ pricing })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating pricing:', error)
    return NextResponse.json(
      { error: 'Failed to create pricing' },
      { status: 500 }
    )
  }
}

