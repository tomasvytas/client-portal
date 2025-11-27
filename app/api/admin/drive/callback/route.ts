import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/admin?tab=settings&drive_auth_error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin?tab=settings&drive_auth_error=No authorization code received', request.url)
      )
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/admin?tab=settings&drive_auth_error=Missing OAuth credentials', request.url)
      )
    }

    const oauth2Client = new google.auth.OAuth2Client(
      clientId,
      clientSecret,
      process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/admin/drive/callback` : 'http://localhost:3000/api/admin/drive/callback'
    )

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/admin?tab=settings&drive_auth_error=No refresh token received. Please try again.', request.url)
      )
    }

    // Return the refresh token - user needs to add it to environment variables
    return NextResponse.redirect(
      new URL(
        `/admin?tab=settings&drive_auth_success=1&refresh_token=${encodeURIComponent(tokens.refresh_token)}`,
        request.url
      )
    )
  } catch (error: any) {
    console.error('Error exchanging code for tokens:', error)
    return NextResponse.redirect(
      new URL(
        `/admin?tab=settings&drive_auth_error=${encodeURIComponent(error?.message || 'Failed to authorize')}`,
        request.url
      )
    )
  }
}

