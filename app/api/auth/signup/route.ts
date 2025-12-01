import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// Generate unique invite code
function generateInviteCode(): string {
  return randomBytes(8).toString('hex').toUpperCase()
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
    const { email, password, name, role, inviteCode, organizationName, subscriptionPlan } = body

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

    // For service providers, organization name and subscription plan are required
    if (role === 'service_provider') {
      if (!organizationName) {
        return NextResponse.json(
          { error: 'Organization name is required for service provider registration' },
          { status: 400 }
        )
      }
      if (!subscriptionPlan) {
        return NextResponse.json(
          { error: 'Subscription plan is required for service provider registration' },
          { status: 400 }
        )
      }
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

    // If service provider, return user info - organization will be created after payment
    if (userRole === 'service_provider') {
      return NextResponse.json({
        message: 'Account created. Redirecting to payment...',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'service_provider',
        },
        requiresPayment: true,
        organizationName,
        subscriptionPlan,
      })
    }

    // If client, link to organization via invite code
    if (userRole === 'client' && inviteCode) {
      const organization = await prisma.organization.findUnique({
        where: { inviteCode },
      })

      if (!organization) {
        return NextResponse.json(
          { error: 'Invalid invite code' },
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

