# Running Database Migrations

## Step 1: Verify DATABASE_URL is Set

1. In Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Look for `DATABASE_URL`
3. It should be automatically added by Neon/Supabase
4. If it's not there, you'll need to add it manually (copy from Neon/Supabase dashboard)

## Step 2: Redeploy (if needed)

If you just added DATABASE_URL, you may need to redeploy:
- Go to **Deployments** tab
- Click **"Redeploy"** on the latest deployment
- Or wait for auto-deploy if you just added the env var

## Step 3: Run Migrations

Open your terminal and run:

```bash
cd "/Users/tomasvytas/AI to AE/client-portal"

# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel (if not already)
vercel login

# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy
```

This will create all the tables in your database!

## Step 4: Verify Tables Created

You can verify in Neon/Supabase dashboard that tables were created:
- User
- Account
- Session
- Task
- Message
- Asset
- Pricing
- VerificationToken

---

## Troubleshooting

**"Environment variable not found: DATABASE_URL"**
- Make sure DATABASE_URL is set in Vercel
- Try: `vercel env pull .env.local` again

**"Connection refused"**
- Check the connection string is correct
- Make sure database is active/running in Neon/Supabase

**"Migration already applied"**
- That's fine! It means tables already exist

