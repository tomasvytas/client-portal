# Neon Database Setup for Vercel

## Step-by-Step Instructions

### Option 1: Neon (Recommended - Easiest)

1. **In Vercel Dashboard:**
   - Go to your project → **Storage** tab
   - Click on **"Neon"** (Serverless Postgres)
   - Click **"Create"** or **"Add Integration"**

2. **If it asks you to connect:**
   - It will redirect you to Neon's website
   - Sign up/login to Neon (free account)
   - Authorize Vercel to connect

3. **Create Database:**
   - Neon will create a database automatically
   - Vercel will automatically add `DATABASE_URL` to your environment variables
   - The connection string will be set automatically

4. **Verify:**
   - Go to **Settings** → **Environment Variables**
   - Check that `DATABASE_URL` is there
   - It should start with `postgres://` or `postgresql://`

---

### Option 2: Supabase (Alternative)

1. **In Vercel Dashboard:**
   - Go to **Storage** tab
   - Click on **"Supabase"** (Postgres backend)
   - Click **"Create"** or **"Add Integration"**

2. **Connect Supabase:**
   - Sign up/login to Supabase
   - Create a new project (free tier available)
   - Copy the connection string from Supabase dashboard

3. **Add to Vercel:**
   - Go to Vercel → **Settings** → **Environment Variables**
   - Add `DATABASE_URL` with the Supabase connection string

---

## After Database Setup

Once you have the database:

1. **Redeploy** your app (to pick up DATABASE_URL)
2. **Run migrations:**
   ```bash
   cd "/Users/tomasvytas/AI to AE/client-portal"
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

---

## Which One to Choose?

- **Neon**: Best integration with Vercel, automatic setup
- **Supabase**: More features (auth, storage), also free tier
- **Prisma Postgres**: If you want Prisma-specific features

**Recommendation**: Start with **Neon** - it's the easiest!

