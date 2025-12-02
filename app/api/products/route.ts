import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const products = await prisma.product.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products })
  } catch (error: any) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, websiteUrl, organizationId } = body

    if (!name || !websiteUrl) {
      return NextResponse.json(
        { error: 'Product name and website URL are required' },
        { status: 400 }
      )
    }

    // Validate URL format
    let normalizedUrl = websiteUrl
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      normalizedUrl = `https://${websiteUrl}`
    }

    // If organizationId is provided, verify the client is linked to it
    let finalOrganizationId: string | null = null
    if (organizationId) {
      const link = await prisma.clientProvider.findUnique({
        where: {
          clientId_organizationId: {
            clientId: session.user.id,
            organizationId: organizationId,
          },
        },
      })

      if (!link) {
        return NextResponse.json(
          { error: 'You are not linked to this service provider' },
          { status: 403 }
        )
      }

      finalOrganizationId = organizationId
    } else {
      // If no organizationId provided, try to find the user's first linked organization
      const firstLink = await prisma.clientProvider.findFirst({
        where: { clientId: session.user.id },
        orderBy: { joinedAt: 'asc' },
      })

      if (firstLink) {
        finalOrganizationId = firstLink.organizationId
      }
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        userId: session.user.id,
        organizationId: finalOrganizationId,
        name: name.trim(),
        websiteUrl: normalizedUrl,
        status: 'pending',
      },
    })

    // Trigger analysis in background
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/products/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        websiteUrl: normalizedUrl,
        productName: name.trim(),
      }),
    }).catch(err => {
      console.error('Error triggering product analysis:', err)
      // Update product status to failed if analysis trigger fails
      prisma.product.update({
        where: { id: product.id },
        data: { status: 'failed' },
      }).catch(console.error)
    })

    return NextResponse.json({
      product,
      message: 'Product created successfully. Analysis will start shortly.',
    })
  } catch (error: any) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}

