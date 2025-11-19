# Quick Start Guide

Follow these steps to get your client portal up and running:

## Step 1: Set Up Environment Variables

You already have a `.env` file. Make sure it contains:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/client_portal?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OPENAI_API_KEY="your-openai-api-key"
```

**Important**: Replace the placeholder values with your actual credentials!

### Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### Get Google OAuth Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env`

## Step 2: Set Up Database

Make sure PostgreSQL is running, then:

```bash
# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

## Step 3: Install Dependencies (if not already done)

```bash
npm install
```

## Step 4: Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Step 5: Make Yourself an Admin

1. First, sign in with your Google account at `http://localhost:3000`
2. Then run this command (replace with your email):

```bash
npx tsx scripts/make-admin.ts your-email@example.com
```

3. Refresh the page - you should see an "Admin Panel" link in the dashboard

## Step 6: Access Admin Panel

- Click "Admin Panel" in the dashboard, or
- Go directly to `http://localhost:3000/admin`

## Troubleshooting

### Database Connection Issues
- Make sure PostgreSQL is running
- Check your `DATABASE_URL` is correct
- Try: `psql -U your_user -d client_portal` to test connection

### Authentication Issues
- Verify Google OAuth credentials are correct
- Check redirect URI matches exactly: `http://localhost:3000/api/auth/callback/google`
- Make sure `NEXTAUTH_SECRET` is set

### Port Already in Use
- Change port: `npm run dev -- -p 3001`
- Or kill the process using port 3000

## Next Steps

1. **Set up pricing**: Go to Admin Panel → Pricing tab and create your pricing tiers
2. **Test client flow**: Create a task as a client and chat with the AI agent
3. **Upload files**: Test the file upload functionality
4. **Manage tasks**: Use the kanban board to organize tasks

Enjoy your client portal! 🚀

