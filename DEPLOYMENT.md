# Deployment Guide for www.task-chat.com

## Option 1: Deploy to Vercel (Recommended - Easiest for Next.js)

### Step 1: Prepare Your Code
1. Make sure all changes are committed to git
2. Push to GitHub/GitLab/Bitbucket

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `client-portal` (if your repo has multiple folders)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 3: Set Environment Variables in Vercel
Go to Project Settings → Environment Variables and add:

```
DATABASE_URL=your-production-postgres-url
NEXTAUTH_URL=https://www.task-chat.com
NEXTAUTH_SECRET=generate-a-random-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
```

**Important**: 
- Generate a new `NEXTAUTH_SECRET` for production (run: `openssl rand -base64 32`)
- Update Google OAuth settings to allow `https://www.task-chat.com` as an authorized redirect URI

### Step 4: Set Up PostgreSQL Database
**Option A: Vercel Postgres (Easiest)**
1. In Vercel dashboard, go to Storage → Create Database → Postgres
2. Copy the connection string to `DATABASE_URL`

**Option B: External Database (Supabase, Railway, Neon, etc.)**
1. Create a PostgreSQL database on your preferred provider
2. Copy the connection string to `DATABASE_URL` in Vercel

### Step 5: Run Database Migrations
After deployment, run migrations:
```bash
# In Vercel, you can use the CLI or add a build script
npx prisma migrate deploy
```

Or add to `package.json`:
```json
"scripts": {
  "postbuild": "prisma migrate deploy"
}
```

### Step 6: Configure Your Domain
1. In Vercel project settings → Domains
2. Add `www.task-chat.com` and `task-chat.com`
3. Follow DNS instructions (add CNAME record pointing to Vercel)
4. SSL certificate is automatically provisioned

### Step 7: Update Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Update your OAuth 2.0 Client:
   - **Authorized JavaScript origins**: `https://www.task-chat.com`
   - **Authorized redirect URIs**: `https://www.task-chat.com/api/auth/callback/google`

---

## Option 2: Deploy to Railway

### Step 1: Set Up Railway
1. Go to [railway.app](https://railway.app) and sign up
2. Create a new project
3. Connect your GitHub repository

### Step 2: Add PostgreSQL
1. Click "New" → "Database" → "PostgreSQL"
2. Railway will automatically set `DATABASE_URL`

### Step 3: Configure Environment Variables
Add all environment variables in Railway dashboard

### Step 4: Deploy
1. Railway will auto-detect Next.js
2. Add custom domain: `www.task-chat.com`
3. Railway provides SSL automatically

---

## Option 3: Deploy to DigitalOcean App Platform

### Step 1: Create App
1. Go to DigitalOcean → App Platform
2. Create new app from GitHub

### Step 2: Add Database
1. Add PostgreSQL database component
2. Connection string is auto-set

### Step 3: Configure Environment Variables
Add all required env vars

### Step 4: Add Domain
1. Add custom domain `www.task-chat.com`
2. Configure DNS as instructed

---

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Environment variables set correctly
- [ ] Google OAuth redirect URIs updated
- [ ] Domain DNS configured correctly
- [ ] SSL certificate active (automatic on most platforms)
- [ ] Test authentication flow
- [ ] Test file uploads (may need storage configuration)
- [ ] Test AI chat functionality

---

## File Upload Storage

Currently, files are stored locally. For production, consider:
- **Vercel Blob Storage** (if using Vercel)
- **AWS S3**
- **Cloudinary**
- **Google Cloud Storage** (already in dependencies)

Update `app/api/tasks/[taskId]/assets/route.ts` to use cloud storage.

---

## Generate Production NEXTAUTH_SECRET

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

Copy the output and use it as your `NEXTAUTH_SECRET` in production.

