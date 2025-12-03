import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/auth/signin',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: ['pkce', 'state'],
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) {
          return null
        }

        // Check if user has a password (stored in Account for credentials provider)
        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: 'credentials',
          },
        })

        if (!account) {
          return null
        }

        // Verify password (stored in account's refresh_token field as a workaround)
        const isValid = await bcrypt.compare(
          credentials.password as string,
          account.refresh_token || ''
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      // Ensure session.user exists
      if (!session.user) {
        session.user = {} as any
      }
      
      // Always set user.id from token.sub (required for authentication)
      if (token.sub) {
        session.user.id = token.sub
      } else {
        console.error('[Auth] Session callback: token.sub is missing!', {
          hasToken: !!token,
          tokenKeys: Object.keys(token || {}),
        })
      }
      
      // Preserve email and name from token if available
      if (token.email) {
        session.user.email = token.email as string
      }
      if (token.name) {
        session.user.name = token.name as string
      }
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Session callback:', {
          hasUser: !!session.user,
          userId: session.user?.id,
          tokenSub: token.sub,
          userEmail: session.user?.email,
        })
      }
      
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id
        // Also store user info in token for session callback
        token.email = user.email
        token.name = user.name
      }
      // Log warning if token.sub is missing (shouldn't happen if user is provided)
      if (!token.sub) {
        console.warn('[Auth] JWT callback: token.sub is not set', {
          hasUser: !!user,
          userId: user?.id,
          tokenSub: token.sub,
        })
      }
      return token
    },
  },
  session: {
    strategy: "jwt",
  },
  cookies: {
    pkceCodeVerifier: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15, // 15 minutes
      },
    },
    state: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 15, // 15 minutes
      },
    },
  },
  debug: process.env.NODE_ENV === 'development',
})

