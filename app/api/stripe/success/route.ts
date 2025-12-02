import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      redirect('/auth/signin')
    }

    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      redirect('/auth/signin?error=missing_session')
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (!checkoutSession.metadata) {
      redirect('/auth/signin?error=invalid_session')
    }

    // Verify the session belongs to the current user
    if (checkoutSession.metadata.userId !== session.user.id) {
      redirect('/auth/signin?error=unauthorized')
    }

    // Check if payment was successful
    if (checkoutSession.payment_status !== 'paid') {
      redirect('/auth/signin?error=payment_failed')
    }

    // Check if organization already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
    })

    if (existingOrg) {
      // Organization already created, just redirect
      redirect('/admin')
    }

    // Create organization and subscription
    const { organizationName, subscriptionPlan } = checkoutSession.metadata

    if (!organizationName || !subscriptionPlan) {
      redirect('/auth/signin?error=missing_data')
    }

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

    // Calculate subscription dates
    const now = new Date()
    let periodEnd = new Date()
    if (subscriptionPlan === '1_month') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else if (subscriptionPlan === '3_month') {
      periodEnd.setMonth(periodEnd.getMonth() + 3)
    } else if (subscriptionPlan === '6_month') {
      periodEnd.setMonth(periodEnd.getMonth() + 6)
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        slug: finalSlug,
        serviceId: finalServiceId,
        ownerId: session.user.id,
        inviteCode,
        inviteLink,
      },
    })

    // Update user role
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        role: 'service_provider',
      },
    })

    // Create subscription
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: subscriptionPlan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        clientCount: 1, // Owner is the first client
        stripeCustomerId: checkoutSession.customer as string | null,
      },
    })

    // Redirect to admin dashboard
    redirect('/admin')
  } catch (error: any) {
    console.error('Error processing payment success:', error)
    redirect('/auth/signin?error=processing_failed')
  }
}

