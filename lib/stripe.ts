import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Subscription plan pricing (in cents)
export const PLAN_PRICES: Record<string, number> = {
  '1_month': 5000, // €50.00
  '3_month': 10500, // €105.00
  '6_month': 15000, // €150.00
}

// Client fees (in cents)
export const CLIENT_FEES: Record<string, number> = {
  '1_month': 1000, // €10.00
  '3_month': 800, // €8.00
  '6_month': 700, // €7.00
}

// Plan intervals
export const PLAN_INTERVALS: Record<string, 'month'> = {
  '1_month': 'month',
  '3_month': 'month',
  '6_month': 'month',
}

// Plan names for Stripe
export const PLAN_NAMES: Record<string, string> = {
  '1_month': '1 Month Plan',
  '3_month': '3 Months Plan',
  '6_month': '6 Months Plan',
}

