# Deployment Summary for www.task-chat.com

## 🎯 Quick Start

1. **Push to GitHub** → Deploy to Vercel
2. **Set up PostgreSQL database** (Vercel Postgres or external)
3. **Configure environment variables** (see below)
4. **Add domain** `www.task-chat.com` in Vercel
5. **Update Google OAuth** redirect URIs
6. **Run database migrations**

---

## 📋 Environment Variables Needed

Copy these to Vercel → Settings → Environment Variables:

```bash
# Database (get from your PostgreSQL provider)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# NextAuth
NEXTAUTH_URL=https://www.task-chat.com
NEXTAUTH_SECRET=ESpZRkopdfCbIpG491m1RyMh8CqFKo+3BLiL2xqoveU=

# Google OAuth (replace with your actual credentials)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# OpenAI (replace with your actual API key)
OPENAI_API_KEY=your-openai-api-key-here
```

**⚠️ Note**: The `NEXTAUTH_SECRET` above is generated. You can use it or generate a new one.

---

## 🔐 Google OAuth Configuration

Update in [Google Cloud Console](https://console.cloud.google.com):

**Authorized JavaScript origins:**
- `https://www.task-chat.com`

**Authorized redirect URIs:**
- `https://www.task-chat.com/api/auth/callback/google`

---

## 🗄️ Database Setup

### Option 1: Vercel Postgres (Easiest)
1. Vercel dashboard → Storage → Create Database → Postgres
2. Copy connection string to `DATABASE_URL`

### Option 2: External Providers
- **Supabase**: [supabase.com](https://supabase.com) - Free tier
- **Neon**: [neon.tech](https://neon.tech) - Free tier  
- **Railway**: [railway.app](https://railway.app) - Free tier

After creating database, run migrations:
```bash
npx prisma migrate deploy
```

---

## 🌐 Domain Configuration

### DNS Records (in your domain registrar)

**For www.task-chat.com:**
- Type: `CNAME`
- Name: `www`
- Value: `cname.vercel-dns.com`

**For task-chat.com (root):**
- Type: `A`
- Name: `@`
- Value: `76.76.21.21` (Vercel's IP - check Vercel dashboard for current IP)

Or use Vercel's nameservers (recommended):
- Set nameservers in your domain registrar to Vercel's nameservers
- Vercel will show you the exact nameservers in the domain settings

---

## 📁 File Uploads (Important!)

**Current Status**: Files are stored locally, which won't work on serverless platforms like Vercel.

**Solutions:**

### Quick Fix: Use Vercel Blob Storage
1. Vercel → Storage → Create → Blob
2. Install: `npm install @vercel/blob`
3. Update `app/api/tasks/[taskId]/assets/route.ts` to use Vercel Blob

### Alternative: Use Railway or DigitalOcean
These platforms support persistent file storage.

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Project deployed to Vercel
- [ ] PostgreSQL database created
- [ ] `DATABASE_URL` environment variable set
- [ ] All environment variables configured
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Domain added in Vercel (`www.task-chat.com`)
- [ ] DNS records configured
- [ ] SSL certificate active (automatic)
- [ ] Google OAuth redirect URIs updated
- [ ] Test authentication flow
- [ ] Test task creation
- [ ] Test AI chat
- [ ] File uploads configured (if needed)

---

## 🚀 Deployment Commands

```bash
# 1. Initialize git (if not done)
cd "/Users/tomasvytas/AI to AE/client-portal"
git init
git add .
git commit -m "Ready for deployment"

# 2. Push to GitHub (create repo first)
git remote add origin https://github.com/YOUR_USERNAME/client-portal.git
git push -u origin main

# 3. After Vercel deployment, run migrations
npx prisma migrate deploy
```

---

## 📚 Full Guides

- **Quick Start**: See `QUICK_DEPLOY.md`
- **Detailed Guide**: See `DEPLOYMENT.md`

---

## 🆘 Common Issues

**"Invalid redirect_uri"**
- Check Google OAuth redirect URI matches exactly
- Ensure `NEXTAUTH_URL` is set correctly

**"Database connection failed"**
- Verify `DATABASE_URL` is correct
- Check database allows external connections
- Run migrations: `npx prisma migrate deploy`

**"File upload fails"**
- Expected on Vercel (serverless)
- Implement cloud storage (see above)

---

Good luck with your deployment! 🎉

