import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { OAuth2Client } from 'google-auth-library'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET' },
        { status: 400 }
      )
    }

    const oauth2Client = new OAuth2Client(
      clientId,
      clientSecret,
      process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/admin/drive/callback` : 'http://localhost:3000/api/admin/drive/callback'
    )

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive',
    ]

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    })

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}

