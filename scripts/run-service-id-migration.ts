/**
 * Script to add serviceId column to Organization table
 * 
 * Usage:
 *   npx tsx scripts/run-service-id-migration.ts
 * 
 * For production:
 *   DATABASE_URL="your-production-url" npx tsx scripts/run-service-id-migration.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

function generateServiceId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude confusing chars
  let serviceId = 'SVC-'
  for (let i = 0; i < 5; i++) {
    serviceId += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return serviceId
}

async function runMigration() {
  try {
    console.log('Checking if serviceId column exists...')
    
    // Check if column exists
    try {
      await prisma.$queryRaw`SELECT "serviceId" FROM "Organization" LIMIT 1`
      console.log('✓ serviceId column already exists. Migration not needed.')
      process.exit(0)
    } catch (error: any) {
      if (!error.message.includes('does not exist') && !error.message.includes('column')) {
        throw error
      }
      // Column doesn't exist, proceed with migration
    }

    console.log('Adding serviceId column to Organization table...')
    
    // Step 1: Add the column (nullable first)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "serviceId" TEXT;
    `)

    console.log('✓ Column added. Generating service IDs for existing organizations...')

    // Step 2: Generate service IDs for existing organizations using raw SQL
    const organizations = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Organization" WHERE "serviceId" IS NULL
    `

    console.log(`Found ${organizations.length} organizations without serviceId`)

    for (const org of organizations) {
      let serviceId = generateServiceId()
      let attempts = 0
      
      // Ensure uniqueness using raw SQL
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
      
      console.log(`  ✓ Generated serviceId for organization ${org.id}: ${serviceId}`)
    }

    console.log('Making serviceId required and unique...')

    // Step 3: Make it NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Organization" ALTER COLUMN "serviceId" SET NOT NULL;
    `)

    // Step 4: Create unique index
    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Organization_serviceId_key" ON "Organization"("serviceId");
      `)
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error
      }
      console.log('  ⚠ Unique index already exists')
    }

    // Step 5: Create regular index
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Organization_serviceId_idx" ON "Organization"("serviceId");
      `)
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error
      }
      console.log('  ⚠ Index already exists')
    }

    console.log('✅ Migration completed successfully!')
    console.log('serviceId column has been added to the Organization table.')
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()

