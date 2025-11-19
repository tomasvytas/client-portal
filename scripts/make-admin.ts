/**
 * Script to make a user an admin
 * 
 * Usage:
 *   npx tsx scripts/make-admin.ts <user-email>
 * 
 * Example:
 *   npx tsx scripts/make-admin.ts admin@example.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function makeAdmin(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error(`User with email ${email} not found`)
      process.exit(1)
    }

    if (user.role === 'admin') {
      console.log(`User ${email} is already an admin`)
      process.exit(0)
    }

    await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
    })

    console.log(`✅ Successfully made ${email} an admin`)
  } catch (error) {
    console.error('Error making user admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const email = process.argv[2]

if (!email) {
  console.error('Please provide an email address')
  console.error('Usage: npx tsx scripts/make-admin.ts <user-email>')
  process.exit(1)
}

makeAdmin(email)

