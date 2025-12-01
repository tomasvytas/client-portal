import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

// Disable body parsing, we need the raw body for webhook signature verification
export const runtime = 'nodejs'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Payment successful - organization should already be created in success handler
        // But we can update subscription with Stripe customer ID if needed
        if (session.metadata?.userId && session.customer) {
          const organization = await prisma.organization.findUnique({
            where: { ownerId: session.metadata.userId },
            include: { subscription: true },
          })

          if (organization?.subscription) {
            await prisma.subscription.update({
              where: { organizationId: organization.id },
              data: {
                stripeCustomerId: session.customer as string,
              },
            })
          }
        }
        break
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        // Handle subscription cancellation or payment failure
        const subscription = event.data.object as Stripe.Subscription
        
        if (subscription.customer) {
          const org = await prisma.organization.findFirst({
            where: {
              subscription: {
                stripeCustomerId: subscription.customer as string,
              },
            },
            include: { subscription: true },
          })

          if (org?.subscription) {
            await prisma.subscription.update({
              where: { organizationId: org.id },
              data: {
                status: 'cancelled',
              },
            })
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

