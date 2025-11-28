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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params
    const body = await request.json()

    // Verify product belongs to user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: session.user.id,
      },
    })

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.websiteUrl !== undefined && { websiteUrl: body.websiteUrl }),
        ...(body.productType !== undefined && { productType: body.productType }),
        ...(body.brandGuidelines !== undefined && { brandGuidelines: body.brandGuidelines }),
        ...(body.analysisData !== undefined && { analysisData: body.analysisData }),
      },
    })

    return NextResponse.json({ product: updatedProduct })
  } catch (error: any) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params

    // Verify product belongs to user
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: session.user.id,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete the product
    await prisma.product.delete({
      where: { id: productId },
    })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}

