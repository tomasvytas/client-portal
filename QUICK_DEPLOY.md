# Quick Deployment Guide for www.task-chat.com

## 🚀 Fastest Path: Vercel (Recommended)

### Prerequisites
- GitHub account
- Domain: www.task-chat.com

### Step-by-Step

#### 1. Push Code to GitHub
```bash
cd "/Users/tomasvytas/AI to AE/client-portal"
git init
git add .
git commit -m "Initial commit"
# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/client-portal.git
git push -u origin main
```

#### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → Sign up/Login
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `client-portal` (if repo has parent folder)
   - **Framework**: Next.js (auto-detected)
   - Click **"Deploy"**

#### 3. Set Up Database
**Option A: Vercel Postgres (Easiest)**
1. In Vercel project → **Storage** tab
2. Click **"Create Database"** → **Postgres**
3. Copy the connection string (starts with `postgres://`)

**Option B: External Database**
- [Supabase](https://supabase.com) (Free tier available)
- [Neon](https://neon.tech) (Free tier available)
- [Railway](https://railway.app) (Free tier available)

#### 4. Set Environment Variables
In Vercel project → **Settings** → **Environment Variables**, add:

```bash
# Database (from step 3)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# NextAuth
NEXTAUTH_URL=https://www.task-chat.com
NEXTAUTH_SECRET=run: openssl rand -base64 32

# Google OAuth (update redirect URIs in Google Console)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# OpenAI
OPENAI_API_KEY=your-openai-key
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

#### 5. Run Database Migrations
After first deployment, in Vercel project → **Deployments** → Click on latest deployment → **Functions** tab, or use Vercel CLI:

```bash
npm i -g vercel
vercel login
cd "/Users/tomasvytas/AI to AE/client-portal"
vercel env pull .env.local
npx prisma migrate deploy
```

Or add to Vercel build command (already in vercel.json):
```json
"buildCommand": "npm run build && npm run db:migrate"
```

#### 6. Configure Domain
1. In Vercel project → **Settings** → **Domains**
2. Add `www.task-chat.com` and `task-chat.com`
3. Follow DNS instructions:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → Vercel's IP (shown in dashboard)
4. SSL is automatic (wait 1-2 minutes)

#### 7. Update Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Your OAuth 2.0 Client → **Authorized redirect URIs**
3. Add: `https://www.task-chat.com/api/auth/callback/google`
4. **Authorized JavaScript origins**: `https://www.task-chat.com`

#### 8. Redeploy
After setting environment variables, trigger a new deployment:
- Vercel dashboard → **Deployments** → **Redeploy**

---

## ⚠️ Important: File Uploads

**Current Issue**: Files are stored locally (`/uploads`), which won't work on serverless platforms.

**Quick Fix Options:**

### Option 1: Vercel Blob Storage (Recommended for Vercel)
1. In Vercel → **Storage** → **Create** → **Blob**
2. Install: `npm install @vercel/blob`
3. Update `app/api/tasks/[taskId]/assets/route.ts` to use Vercel Blob

### Option 2: Temporary Workaround
For now, file uploads will fail on Vercel. You can:
- Disable file uploads temporarily
- Or use a platform that supports persistent storage (Railway, DigitalOcean)

---

## ✅ Post-Deployment Checklist

- [ ] Database migrations completed
- [ ] Environment variables set
- [ ] Google OAuth redirect URI updated
- [ ] Domain DNS configured
- [ ] SSL certificate active (check https://www.task-chat.com)
- [ ] Test login with Google
- [ ] Test creating a task
- [ ] Test AI chat
- [ ] Test file uploads (if configured)

---

## 🔧 Troubleshooting

**"Database connection failed"**
- Check `DATABASE_URL` is correct
- Ensure database is accessible from internet
- Run migrations: `npx prisma migrate deploy`

**"OAuth error"**
- Verify redirect URI matches exactly
- Check `NEXTAUTH_URL` matches your domain
- Ensure `NEXTAUTH_SECRET` is set

**"File upload fails"**
- Expected on Vercel (serverless)
- Need to implement cloud storage (see above)

---

## 📞 Need Help?

Check the full guide: `DEPLOYMENT.md`

