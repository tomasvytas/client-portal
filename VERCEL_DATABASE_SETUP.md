# Vercel Postgres Database Setup Guide

## Step-by-Step Instructions

### 1. Navigate to Your Project
- Go to [vercel.com](https://vercel.com) and sign in
- Click on your **client-portal** project

### 2. Open Storage Tab
- In your project dashboard, look for the **"Storage"** tab in the top navigation
- Click on it

### 3. Create Postgres Database
- Click the **"Create Database"** button
- Select **"Postgres"** from the options
- Choose a name (e.g., "client-portal-db") or use the default
- Select a region (choose one closest to you or your users)
- Click **"Create"**

### 4. Get Connection String
- Once created, Vercel will show you the database details
- Look for **"Connection String"** or **"DATABASE_URL"**
- It will look like: `postgres://default:password@host.vercel-storage.com:5432/verceldb`
- **Copy this entire string** - you'll need it in the next step

### 5. Automatic Environment Variable
- Vercel should automatically add `DATABASE_URL` to your environment variables
- But let's verify: Go to **Settings** → **Environment Variables**
- Check if `DATABASE_URL` is already there
- If not, add it manually:
  - Key: `DATABASE_URL`
  - Value: (paste the connection string you copied)
  - Environment: Select **Production**, **Preview**, and **Development**

### 6. Verify Database is Ready
- The database should be ready to use immediately
- You can see it listed in the Storage tab

---

## Next Steps After Database Setup

Once the database is created:

1. **Redeploy your app** (to pick up the new DATABASE_URL)
2. **Run migrations** to create the tables:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

---

## Troubleshooting

**Can't find Storage tab?**
- Make sure you're on a paid Vercel plan (Hobby plan includes Storage)
- Or use an external database (Supabase, Neon, Railway) - all have free tiers

**Connection string not working?**
- Make sure you copied the entire string including `postgres://`
- Check that the database status shows "Ready" or "Active"

**Need help?** Let me know what step you're on and I'll help!

