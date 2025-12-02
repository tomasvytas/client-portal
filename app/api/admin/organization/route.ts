import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isServiceProvider } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// Generate unique invite code
function generateInviteCode(): string {
  return randomBytes(8).toString('hex').toUpperCase()
}

// Generate Service ID (e.g., SVC-XXXXX)
function generateServiceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars
  let serviceId = 'SVC-'
  for (let i = 0; i < 5; i++) {
    serviceId += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return serviceId
}

// Generate URL-friendly slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's organization (check if user owns an organization)
    let organization = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
      include: {
        subscription: {
          select: {
            plan: true,
            status: true,
            clientCount: true,
            currentPeriodEnd: true,
          },
        },
      },
    })

    // If user is a service provider but doesn't have an organization, create one (demo mode)
    if (!organization && (user.role === 'service_provider' || user.role === 'admin')) {
      try {
        console.log(`[Organization API] Creating organization for user ${session.user.id} with role ${user.role}`)
        const organizationName = `${user.name || user.email?.split('@')[0] || 'My'}'s Organization`
        const slug = generateSlug(organizationName)
        const inviteCode = generateInviteCode()
        const serviceId = generateServiceId()
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const inviteLink = `${baseUrl}/auth/signup?invite=${inviteCode}`

        // Check if slug already exists
        const existingSlug = await prisma.organization.findUnique({
          where: { slug },
        })

        let finalSlug = slug
        if (existingSlug) {
          finalSlug = `${slug}-${Date.now()}`
        }

        // Ensure serviceId is unique
        let finalServiceId = serviceId
        let attempts = 0
        while (attempts < 10) {
          const existing = await prisma.organization.findUnique({
            where: { serviceId: finalServiceId },
          })
          if (!existing) break
          finalServiceId = generateServiceId()
          attempts++
        }

        // Calculate subscription dates (demo mode - default to 6 months)
        const now = new Date()
        const periodEnd = new Date()
        periodEnd.setMonth(periodEnd.getMonth() + 6) // Default 6 months for demo

        // Create organization
        organization = await prisma.organization.create({
          data: {
            name: organizationName,
            slug: finalSlug,
            serviceId: finalServiceId,
            ownerId: session.user.id,
            inviteCode,
            inviteLink,
          },
          include: {
            subscription: {
              select: {
                plan: true,
                status: true,
                clientCount: true,
                currentPeriodEnd: true,
              },
            },
          },
        })

        console.log(`[Organization API] Created organization ${organization.id} for user ${session.user.id}`)

        // Create subscription (demo mode - always active)
        await prisma.subscription.create({
          data: {
            organizationId: organization.id,
            plan: '6_month',
            status: 'active', // Demo mode - always active
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            clientCount: 0,
          },
        })

        console.log(`[Organization API] Created subscription for organization ${organization.id}`)

        // Fetch organization again with subscription
        organization = await prisma.organization.findUnique({
          where: { id: organization.id },
          include: {
            subscription: {
              select: {
                plan: true,
                status: true,
                clientCount: true,
                currentPeriodEnd: true,
              },
            },
          },
        })

        console.log(`[Organization API] Fetched organization ${organization?.id} with subscription`)
      } catch (createError: any) {
        console.error('[Organization API] Error creating organization:', createError)
        // Don't throw - let it return null so the UI can handle it
        organization = null
      }
    }

    if (!organization) {
      return NextResponse.json({ organization: null })
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        serviceId: organization.serviceId,
        inviteCode: organization.inviteCode,
        inviteLink: organization.inviteLink,
        subscription: organization.subscription
          ? {
              plan: organization.subscription.plan,
              status: organization.subscription.status,
              clientCount: organization.subscription.clientCount,
              currentPeriodEnd: organization.subscription.currentPeriodEnd.toISOString(),
            }
          : null,
      },
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching organization:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}

