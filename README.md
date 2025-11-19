# Client Portal

A professional client portal built with Next.js, featuring Google OAuth authentication, AI-powered chat interface, and task management.

## Features

- 🔐 **Google OAuth Authentication** - Secure login with Google accounts
- 💬 **AI-Powered Chat Interface** - Intelligent agent that asks structured questions about projects
- 📋 **Task Management** - Create and manage multiple task chats
- 📎 **File Upload** - Upload assets and reference materials
- 💰 **Pricing Estimates** - Automatic pricing calculations based on project details
- 💾 **Persistent Chat History** - All conversations are saved and accessible

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: OpenAI GPT-4o-mini
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

1. Create a PostgreSQL database
2. Copy `.env.example` to `.env`
3. Update `DATABASE_URL` in `.env` with your database connection string

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your app URL (e.g., `http://localhost:3000`)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `OPENAI_API_KEY` - From OpenAI

### 4. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env`

### 5. Run Database Migrations

```bash
npx prisma migrate dev
```

### 6. Generate Prisma Client

```bash
npx prisma generate
```

### 7. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your app.

## Project Structure

```
client-portal/
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth routes
│   │   ├── tasks/          # Task CRUD operations
│   │   └── files/          # File serving
│   ├── tasks/[taskId]/     # Individual task chat page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Dashboard
├── components/
│   ├── Dashboard.tsx       # Main dashboard with task list
│   └── ChatInterface.tsx   # Chat UI component
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── ai-agent.ts         # AI agent logic
│   └── prisma.ts           # Prisma client
└── prisma/
    └── schema.prisma       # Database schema
```

## Admin Panel

The admin panel provides:
- **Task Board**: Trello-like kanban board to manage all client tasks
- **Pricing Management**: Create, edit, and manage pricing tiers
- **Task Overview**: See all tasks from all clients in one place

### Making Yourself an Admin

After signing in with your Google account, run:

```bash
npx tsx scripts/make-admin.ts your-email@example.com
```

Then access the admin panel at `/admin` or click the "Admin Panel" link in the dashboard.

## How It Works

1. **Authentication**: Users sign in with Google OAuth
2. **Task Creation**: Users create new task chats from the dashboard
3. **AI Agent**: The agent asks structured questions to collect:
   - Product/service information
   - Project details and requirements
   - Deadlines
   - Any other relevant information
4. **Pricing**: When asked, the agent calculates pricing based on project type and complexity
5. **File Uploads**: Users can upload assets that are stored and associated with tasks
6. **Chat History**: All messages are persisted in the database
7. **Admin Panel**: Admins can manage all tasks and pricing from a centralized dashboard

## Database Schema

- **User**: User accounts (from NextAuth)
- **Task**: Project tasks with metadata
- **Message**: Chat messages (user and assistant)
- **Asset**: Uploaded files associated with tasks

## Production Deployment

1. Set up production database (e.g., Vercel Postgres, Supabase)
2. Update environment variables in your hosting platform
3. Update `NEXTAUTH_URL` to your production domain
4. Add production redirect URI in Google Cloud Console
5. Consider using cloud storage (S3, Cloudinary) for file uploads instead of local storage

## License

MIT
