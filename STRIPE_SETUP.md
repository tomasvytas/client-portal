# Stripe Payment Integration Setup

## Environment Variables

Add the following environment variables to your Vercel project:

### Required Variables

1. **STRIPE_SECRET_KEY**
   - Your Stripe secret key (test mode)
   - Get from: Stripe Dashboard → Developers → API keys → Secret key
   - Use your test mode secret key

2. **STRIPE_PUBLISHABLE_KEY** (for client-side if needed)
   - Your Stripe publishable key (test mode)
   - Get from: Stripe Dashboard → Developers → API keys → Publishable key
   - Use your test mode publishable key

3. **STRIPE_WEBHOOK_SECRET**
   - Webhook signing secret from Stripe Dashboard
   - To get this:
     1. Go to Stripe Dashboard → Developers → Webhooks
     2. Click "Add endpoint"
     3. Enter your webhook URL: `https://your-domain.com/api/stripe/webhook`
     4. Select events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
     5. Copy the "Signing secret" and add it as `STRIPE_WEBHOOK_SECRET`

## How It Works

1. **Service Provider Registration**:
   - User signs up as service provider
   - Account is created but organization is NOT created yet
   - User is redirected to Stripe Checkout

2. **Payment Flow**:
   - User completes payment on Stripe Checkout
   - Stripe redirects to `/api/stripe/success`
   - Organization and subscription are created
   - User is redirected to admin dashboard

3. **Webhook Handling**:
   - Stripe sends webhook events to `/api/stripe/webhook`
   - Handles subscription updates, cancellations, etc.

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date and any CVC

## Production

When ready for production:
1. Switch to live mode keys in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook endpoint URL in Stripe Dashboard
4. Test with real payment methods

