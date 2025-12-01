/**
 * Script to make a user a master admin
 * 
 * Usage:
 *   npx tsx scripts/make-master-admin.ts <user-email>
 * 
 * Example:
 *   npx tsx scripts/make-master-admin.ts admin@example.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function makeMasterAdmin(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error(`User with email ${email} not found`)
      process.exit(1)
    }

    if (user.isMasterAdmin) {
      console.log(`User ${email} is already a master admin`)
      process.exit(0)
    }

    await prisma.user.update({
      where: { email },
      data: { 
        isMasterAdmin: true,
        role: 'master_admin', // Also set role for clarity
      },
    })

    console.log(`✅ Successfully made ${email} a master admin`)
    console.log(`   You can now access the Master Admin dashboard at /admin`)
  } catch (error) {
    console.error('Error making user master admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Please provide an email address')
  console.error('Usage: npx tsx scripts/make-master-admin.ts <user-email>')
  process.exit(1)
}

makeMasterAdmin(email)

