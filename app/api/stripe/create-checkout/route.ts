import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe, PLAN_PRICES, PLAN_NAMES } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationName, subscriptionPlan } = body

    if (!organizationName || !subscriptionPlan) {
      return NextResponse.json(
        { error: 'Organization name and subscription plan are required' },
        { status: 400 }
      )
    }

    if (!['1_month', '3_month', '6_month'].includes(subscriptionPlan)) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    // Check if user already has an organization
    const existingOrg = await prisma.organization.findUnique({
      where: { ownerId: session.user.id },
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'You already have an organization' },
        { status: 400 }
      )
    }

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time payment for subscription periods
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: PLAN_NAMES[subscriptionPlan],
              description: `Subscription for ${organizationName}`,
            },
            unit_amount: PLAN_PRICES[subscriptionPlan],
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/auth/signin?error=payment_cancelled`,
      metadata: {
        userId: session.user.id,
        organizationName,
        subscriptionPlan,
      },
      customer_email: session.user.email || undefined,
    })

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

