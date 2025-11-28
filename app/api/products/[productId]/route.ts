import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: session.user.id,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

