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

    const results: string[] = []
    const migrationsToRun = [
      {
        name: 'Add companyName to User',
        path: '20251201155704_add_company_name_to_user',
        check: async () => {
          try {
            await prisma.$queryRaw`SELECT "companyName" FROM "User" LIMIT 1`
            return true // Column exists
          } catch {
            return false // Column doesn't exist
          }
        },
      },
      {
        name: 'Add serviceId to Organization',
        path: '20251201180000_add_service_id_to_organization',
        check: async () => {
          try {
            await prisma.$queryRaw`SELECT "serviceId" FROM "Organization" LIMIT 1`
            return true // Column exists
          } catch {
            return false // Column doesn't exist
          }
        },
      },
    ]

    // Run each migration
    for (const migration of migrationsToRun) {
      const alreadyExists = await migration.check()
      if (alreadyExists) {
        results.push(`⚠ Skipped: ${migration.name} (already applied)`)
        continue
      }

      // Read the migration SQL file
      const migrationPath = join(process.cwd(), 'prisma', 'migrations', migration.path, 'migration.sql')
      let migrationSQL: string
      try {
        migrationSQL = await readFile(migrationPath, 'utf-8')
      } catch (error: any) {
        results.push(`✗ Failed: ${migration.name} - Could not read migration file: ${error?.message}`)
        continue
      }

      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.length === 0) continue
        
        try {
          // Execute each SQL statement
          await prisma.$executeRawUnsafe(statement)
          results.push(`✓ Executed: ${migration.name} - ${statement.substring(0, 50)}...`)
        } catch (error: any) {
          // Check if error is because column/table already exists
          const errorMsg = error?.message || ''
          if (
            errorMsg.includes('already exists') ||
            errorMsg.includes('duplicate') ||
            (errorMsg.includes('relation') && errorMsg.includes('already')) ||
            errorMsg.includes('column') && errorMsg.includes('already')
          ) {
            results.push(`⚠ Skipped (already exists): ${migration.name} - ${statement.substring(0, 50)}...`)
          } else {
            // Real error - add to results but continue
            results.push(`✗ Failed: ${migration.name} - ${statement.substring(0, 50)}... Error: ${errorMsg}`)
          }
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

