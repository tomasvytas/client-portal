/**
 * Script to run companyName migration on production database
 * 
 * Usage:
 *   DATABASE_URL="your-production-db-url" npx tsx scripts/migrate-production.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    console.log('Usage: DATABASE_URL="your-db-url" npx tsx scripts/migrate-production.ts')
    process.exit(1)
  }

  try {
    console.log('Connecting to production database...')
    console.log('Checking if companyName column exists...')
    
    // Check if column exists
    try {
      await prisma.$queryRaw`SELECT "companyName" FROM "User" LIMIT 1`
      console.log('✓ companyName column already exists. Migration not needed.')
      process.exit(0)
    } catch (error: any) {
      if (!error.message.includes('does not exist') && !error.message.includes('column')) {
        throw error
      }
      // Column doesn't exist, proceed with migration
    }

    console.log('Adding companyName column to User table...')
    
    // Run the migration
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
    `)

    console.log('✅ Migration completed successfully!')
    console.log('companyName column has been added to the User table.')
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runMigration()

