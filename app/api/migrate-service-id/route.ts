import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function generateServiceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let serviceId = 'SVC-'
  for (let i = 0; i < 5; i++) {
    serviceId += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return serviceId
}

export async function POST(request: NextRequest) {
  try {
    // Simple token check (you can remove this after migration is done)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.MIGRATION_TOKEN || 'migrate-service-id-2024'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Migration] Starting serviceId migration...')

    // Check if column exists
    try {
      await prisma.$queryRaw`SELECT "serviceId" FROM "Organization" LIMIT 1`
      return NextResponse.json({
        success: true,
        message: 'serviceId column already exists. Migration not needed.',
      })
    } catch (error: any) {
      if (!error.message.includes('does not exist') && !error.message.includes('column')) {
        throw error
      }
      // Column doesn't exist, proceed
    }

    console.log('[Migration] Adding serviceId column...')

    // Step 1: Add the column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
    `)

    console.log('[Migration] Generating service IDs for existing organizations...')

    // Step 2: Generate service IDs for existing organizations
    const organizations = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Organization" WHERE "serviceId" IS NULL
    `

    const results: string[] = []
    results.push(`Found ${organizations.length} organizations without serviceId`)

    for (const org of organizations) {
      let serviceId = generateServiceId()
      let attempts = 0
      
      // Ensure uniqueness
      while (attempts < 10) {
        const existing = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "Organization" WHERE "serviceId" = ${serviceId} LIMIT 1
        `
        if (existing.length === 0) break
        serviceId = generateServiceId()
        attempts++
      }

      await prisma.$executeRaw`
        UPDATE "Organization" SET "serviceId" = ${serviceId} WHERE id = ${org.id}
      `
      
      results.push(`Generated serviceId for ${org.id}: ${serviceId}`)
    }

    console.log('[Migration] Making serviceId required and unique...')

    // Step 3: Make it NOT NULL (only if all orgs have serviceId)
    if (organizations.length === 0 || organizations.length === results.length - 1) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Organization" ALTER COLUMN "serviceId" SET NOT NULL;
      `)
      results.push('Made serviceId NOT NULL')
    }

    // Step 4: Create unique index
    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Organization_serviceId_key" ON "Organization"("serviceId");
      `)
      results.push('Created unique index')
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error
      }
      results.push('Unique index already exists')
    }

    // Step 5: Create regular index
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Organization_serviceId_idx" ON "Organization"("serviceId");
      `)
      results.push('Created index')
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error
      }
      results.push('Index already exists')
    }

    console.log('[Migration] ✅ Migration completed successfully!')

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      results,
    })
  } catch (error: any) {
    console.error('[Migration] ❌ Migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Migration failed',
      },
      { status: 500 }
    )
  }
}

