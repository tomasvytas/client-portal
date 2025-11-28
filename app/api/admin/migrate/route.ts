import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'

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

    // Check if Product table already exists
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Product" LIMIT 1`
      return NextResponse.json({
        success: true,
        message: 'Product table already exists. Migration not needed.',
        skipped: true,
      })
    } catch (error: any) {
      // Table doesn't exist, proceed with migration
      if (!error.message.includes('does not exist') && !error.message.includes('relation') && !error.message.includes('table')) {
        // Some other error occurred
        throw error
      }
    }

    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'prisma', 'migrations', '20251128094456_add_product_model', 'migration.sql')
    let migrationSQL: string
    try {
      migrationSQL = await readFile(migrationPath, 'utf-8')
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not read migration file: ${error?.message}`,
        },
        { status: 500 }
      )
    }

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const results: string[] = []

    for (const statement of statements) {
      if (statement.length === 0) continue
      
      try {
        // Execute each SQL statement
        await prisma.$executeRawUnsafe(statement)
        results.push(`✓ Executed: ${statement.substring(0, 50)}...`)
      } catch (error: any) {
        // Check if error is because table/index already exists
        const errorMsg = error?.message || ''
        if (
          errorMsg.includes('already exists') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('relation') && errorMsg.includes('already')
        ) {
          results.push(`⚠ Skipped (already exists): ${statement.substring(0, 50)}...`)
        } else {
          // Real error - throw it
          throw new Error(`Failed to execute SQL: ${statement.substring(0, 100)}... Error: ${errorMsg}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      results,
    })
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

