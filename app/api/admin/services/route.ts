import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const services = await prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ services })
  } catch (error: any) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch services' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { name, description, keywords, isActive } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      )
    }

    const service = await prisma.service.create({
      data: {
        name,
        description: description || null,
        keywords: keywords || [],
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json({ service })
  } catch (error: any) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create service' },
      { status: 500 }
    )
  }
}

