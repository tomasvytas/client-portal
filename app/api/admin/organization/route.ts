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

// Generate CUID-like ID (simple version)
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `c${timestamp}${random}`
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
        // Try with serviceId first, fallback to raw SQL if column doesn't exist
        try {
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
        } catch (serviceIdError: any) {
          // If serviceId column doesn't exist, use raw SQL
          if (serviceIdError?.message?.includes('serviceId') || 
              serviceIdError?.message?.includes('column') ||
              serviceIdError?.code === 'P2003' ||
              serviceIdError?.code === 'P2011') {
            console.log('[Organization API] serviceId column may not exist, using raw SQL')
            
            // Create organization using raw SQL (without serviceId)
            const orgId = generateCuid()
            await prisma.$executeRaw`
              INSERT INTO "Organization" (id, name, slug, "ownerId", "inviteCode", "inviteLink", "createdAt", "updatedAt")
              VALUES (${orgId}, ${organizationName}, ${finalSlug}, ${session.user.id}, ${inviteCode}, ${inviteLink}, NOW(), NOW())
            `
            
            // Try to add serviceId if column exists
            try {
              await prisma.$executeRaw`
                UPDATE "Organization" 
                SET "serviceId" = ${finalServiceId} 
                WHERE id = ${orgId}
              `
            } catch (updateError) {
              console.warn('[Organization API] Could not update serviceId (column may not exist):', updateError)
            }
            
            // Re-fetch with subscription included
            organization = await prisma.organization.findUnique({
              where: { id: orgId },
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
          } else {
            throw serviceIdError
          }
        }

        // Ensure organization was created successfully
        if (!organization) {
          throw new Error('Failed to create organization')
        }

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
        // Return the actual error so we can debug
        return NextResponse.json(
          { 
            error: 'Failed to create organization',
            details: createError?.message || 'Unknown error',
            code: createError?.code,
          },
          { status: 500 }
        )
      }
    }

    if (!organization) {
      // Only return null if user is not a service provider/admin
      if (user.role !== 'service_provider' && user.role !== 'admin') {
        return NextResponse.json({ organization: null })
      }
      // If user is service provider/admin but no org, something went wrong
      return NextResponse.json(
        { 
          error: 'Organization not found and could not be created',
          userRole: user.role,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        serviceId: organization.serviceId || null, // Handle case where serviceId might not exist
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
    console.error('[Organization API] Top-level error:', error)
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: 'Failed to fetch organization',
        details: error?.message || 'Unknown error',
        code: error?.code,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    )
  }
}

