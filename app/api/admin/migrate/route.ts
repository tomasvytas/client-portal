import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: 'DATABASE_URL environment variable is not set',
        },
        { status: 500 }
      )
    }

    // Run migration using Prisma CLI
    // Note: In serverless environments, we need to use exec
    // This works because Prisma CLI is available in the build environment
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      })

      return NextResponse.json({
        success: true,
        message: 'Migration completed successfully',
        output: stdout,
        error: stderr || null,
      })
    } catch (execError: any) {
      // If exec fails, try to provide helpful error message
      const errorMessage = execError?.message || 'Unknown error'
      const errorOutput = execError?.stdout || execError?.stderr || ''

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          output: errorOutput,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Migration failed',
      },
      { status: 500 }
    )
  }
}

