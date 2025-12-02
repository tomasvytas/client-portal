import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role, inviteCode, organizationName, subscriptionPlan, companyName, productWebsite, productName } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Validate role
    if (role && !['client', 'service_provider'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "client" or "service_provider"' },
        { status: 400 }
      )
    }

    // For clients, invite code is required
    if (role === 'client' && !inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required for client registration' },
        { status: 400 }
      )
    }

    // For service providers, organization name is required (subscription plan optional for demo mode)
    if (role === 'service_provider') {
      if (!organizationName) {
        return NextResponse.json(
          { error: 'Organization name is required for service provider registration' },
          { status: 400 }
        )
      }
      // Subscription plan is optional - defaults to 6_month for demo mode
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with role
    const userRole = role || 'client'
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        emailVerified: null,
        role: userRole,
        companyName: userRole === 'client' && companyName ? companyName.trim() : null,
      },
    })

    // Create credentials account
    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: user.id,
        refresh_token: hashedPassword,
        access_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
      },
    })

    // If service provider, create organization immediately (demo mode - bypass payment)
    if (userRole === 'service_provider') {
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

      // Check if serviceId column exists in database
      let serviceIdColumnExists = false
      try {
        await prisma.$queryRaw`SELECT "serviceId" FROM "Organization" LIMIT 1`
        serviceIdColumnExists = true
      } catch (error: any) {
        // Column doesn't exist
        console.log('[Signup] serviceId column does not exist in database')
        serviceIdColumnExists = false
      }

      // Ensure serviceId is unique (only if column exists)
      let finalServiceId = serviceId
      if (serviceIdColumnExists) {
        let attempts = 0
        while (attempts < 10) {
          try {
            const existing = await prisma.organization.findUnique({
              where: { serviceId: finalServiceId },
            })
            if (!existing) break
            finalServiceId = generateServiceId()
            attempts++
          } catch (error: any) {
            // If query fails, skip uniqueness check
            if (error?.code === 'P2022' || error?.message?.includes('serviceId')) {
              console.log('[Signup] Cannot check serviceId uniqueness, skipping')
              serviceIdColumnExists = false
              break
            }
            throw error
          }
        }
      }

      // Calculate subscription dates (demo mode - default to 6 months)
      const now = new Date()
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + 6) // Default 6 months for demo

      // Create organization
      let organization
      try {
        // Always try to create with serviceId first (column should exist after migration)
        organization = await prisma.organization.create({
          data: {
            name: organizationName,
            slug: finalSlug,
            serviceId: finalServiceId,
            ownerId: user.id,
            inviteCode,
            inviteLink,
          },
        })

        // If serviceId column doesn't exist, try to add it via raw SQL
        if (!serviceIdColumnExists) {
          try {
            await prisma.$executeRaw`
              UPDATE "Organization" 
              SET "serviceId" = ${finalServiceId} 
              WHERE id = ${organization.id}
            `
            // Re-fetch to get serviceId
            organization = await prisma.organization.findUnique({
              where: { id: organization.id },
            })
          } catch (updateError) {
            console.warn('[Signup] Could not update serviceId (column may not exist):', updateError)
          }
        }
      } catch (createError: any) {
        // If serviceId column doesn't exist, create using raw SQL
        if (createError?.code === 'P2022' || createError?.message?.includes('serviceId')) {
          console.log('[Signup] Creating organization using raw SQL (serviceId column missing)')
          // Generate CUID-like ID
          const timestamp = Date.now().toString(36)
          const random = Math.random().toString(36).substring(2, 10)
          const orgId = `c${timestamp}${random}`
          
          // Create organization using raw SQL
          await prisma.$executeRaw`
            INSERT INTO "Organization" (id, name, slug, "ownerId", "inviteCode", "inviteLink", "createdAt", "updatedAt")
            VALUES (${orgId}, ${organizationName}, ${finalSlug}, ${user.id}, ${inviteCode}, ${inviteLink}, NOW(), NOW())
          `
          
          // Try to add serviceId via raw SQL if column exists
          try {
            await prisma.$executeRaw`
              UPDATE "Organization" 
              SET "serviceId" = ${finalServiceId} 
              WHERE id = ${orgId}
            `
          } catch (updateError) {
            console.warn('[Signup] Could not update serviceId (column may not exist):', updateError)
          }
          
          // Re-fetch the organization
          organization = await prisma.organization.findUnique({
            where: { id: orgId },
          })
        } else {
          throw createError
        }
      }

      // Ensure organization was created successfully
      if (!organization) {
        throw new Error('Failed to create organization')
      }

      // Create subscription (demo mode - always active)
      await prisma.subscription.create({
        data: {
          organizationId: organization.id,
          plan: subscriptionPlan || '6_month',
          status: 'active', // Demo mode - always active
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          clientCount: 0,
        },
      })

      return NextResponse.json({
        message: 'Service provider account created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'service_provider',
        },
        organization: {
          id: organization.id,
          name: organization.name,
          serviceId: organization.serviceId,
          inviteCode: organization.inviteCode,
        },
      })
    }

    // If client, link to organization via invite code
    if (userRole === 'client' && inviteCode) {
      // Trim and normalize invite code
      const normalizedInviteCode = inviteCode.trim().toUpperCase()
      
      const organization = await prisma.organization.findUnique({
        where: { inviteCode: normalizedInviteCode },
      })

      if (!organization) {
        return NextResponse.json(
          { error: 'Invalid invite code. Please check the code and try again.' },
          { status: 400 }
        )
      }

      // Check subscription status
      const subscription = await prisma.subscription.findUnique({
        where: { organizationId: organization.id },
      })

      if (!subscription || subscription.status !== 'active') {
        return NextResponse.json(
          { error: 'This service provider\'s subscription is not active' },
          { status: 400 }
        )
      }

      // Link client to organization
      await prisma.clientProvider.create({
        data: {
          clientId: user.id,
          organizationId: organization.id,
        },
      })

      // Update client count
      await prisma.subscription.update({
        where: { organizationId: organization.id },
        data: {
          clientCount: {
            increment: 1,
          },
        },
      })

      // If product website and name provided, create product and trigger analysis
      let productCreated = false
      if (productWebsite && productName) {
        try {
          // Validate URL format
          const websiteUrl = productWebsite.startsWith('http') ? productWebsite : `https://${productWebsite}`
          
          // Create product
          const product = await prisma.product.create({
            data: {
              userId: user.id,
              organizationId: organization.id,
              name: productName.trim(),
              websiteUrl,
              status: 'pending',
            },
          })

          productCreated = true

          // Trigger analysis in background (don't wait for it)
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          fetch(`${baseUrl}/api/products/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              websiteUrl,
            }),
          }).catch(err => {
            console.error('Error triggering product analysis:', err)
            // Don't fail registration if analysis fails
          })
        } catch (error: any) {
          console.error('Error creating product during signup:', error)
          // Don't fail registration if product creation fails
        }
      }

      return NextResponse.json({
        message: 'Client account created and linked successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        organization: {
          id: organization.id,
          name: organization.name,
        },
        productCreated,
      })
    }

    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create account' },
      { status: 500 }
    )
  }
}

