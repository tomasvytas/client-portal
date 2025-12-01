/**
 * Script to set up a user as a PRO subscriber (service provider with subscription)
 *
 * Usage:
 *   npx tsx scripts/setup-pro-subscriber.ts <user-email> [organization-name] [plan]
 *
 * Example:
 *   npx tsx scripts/setup-pro-subscriber.ts tv.vytas@gmail.com "My Company" 6_month
 *
 * Plans: 1_month, 3_month, 6_month (default: 6_month)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

async function setupProSubscriber(
  email: string,
  organizationName: string = 'My Organization',
  plan: '1_month' | '3_month' | '6_month' = '6_month'
) {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ownedOrganization: {
          include: {
            subscription: true,
          },
        },
      },
    })

    if (!user) {
      console.error(`User with email ${email} not found`)
      process.exit(1)
    }

    // Check if user already has an organization
    if (user.ownedOrganization) {
      console.log(`User ${email} already has an organization: ${user.ownedOrganization.name}`)
      
      // Update subscription if needed
      if (user.ownedOrganization.subscription) {
        const periodEnd = new Date()
        if (plan === '1_month') {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        } else if (plan === '3_month') {
          periodEnd.setMonth(periodEnd.getMonth() + 3)
        } else if (plan === '6_month') {
          periodEnd.setMonth(periodEnd.getMonth() + 6)
        }

        await prisma.subscription.update({
          where: { organizationId: user.ownedOrganization.id },
          data: {
            plan,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
          },
        })

        console.log(`✅ Updated subscription to ${plan} plan`)
      } else {
        // Create subscription
        const periodEnd = new Date()
        if (plan === '1_month') {
          periodEnd.setMonth(periodEnd.getMonth() + 1)
        } else if (plan === '3_month') {
          periodEnd.setMonth(periodEnd.getMonth() + 3)
        } else if (plan === '6_month') {
          periodEnd.setMonth(periodEnd.getMonth() + 6)
        }

        await prisma.subscription.create({
          data: {
            organizationId: user.ownedOrganization.id,
            plan,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            clientCount: 0,
          },
        })

        console.log(`✅ Created ${plan} subscription`)
      }

      // Update user role
      await prisma.user.update({
        where: { email },
        data: {
          role: 'service_provider',
        },
      })

      console.log(`✅ User is now a service provider`)
      process.exit(0)
    }

    // Create organization
    const slug = generateSlug(organizationName)
    const inviteCode = generateInviteCode()
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/auth/signup?invite=${inviteCode}`

    // Check if slug already exists
    const existingSlug = await prisma.organization.findUnique({
      where: { slug },
    })

    let finalSlug = slug
    if (existingSlug) {
      finalSlug = `${slug}-${Date.now()}`
    }

    // Calculate subscription dates
    const now = new Date()
    let periodEnd = new Date()
    if (plan === '1_month') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else if (plan === '3_month') {
      periodEnd.setMonth(periodEnd.getMonth() + 3)
    } else if (plan === '6_month') {
      periodEnd.setMonth(periodEnd.getMonth() + 6)
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        slug: finalSlug,
        ownerId: user.id,
        inviteCode,
        inviteLink,
      },
    })

    // Update user role
    await prisma.user.update({
      where: { email },
      data: {
        role: 'service_provider',
      },
    })

    // Create subscription
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        clientCount: 0,
      },
    })

    console.log(`✅ Successfully set up ${email} as PRO subscriber`)
    console.log(`   Organization: ${organizationName}`)
    console.log(`   Plan: ${plan}`)
    console.log(`   Invite Code: ${inviteCode}`)
    console.log(`   Invite Link: ${inviteLink}`)
  } catch (error) {
    console.error('Error setting up PRO subscriber:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

const email = process.argv[2]
const orgName = process.argv[3] || 'My Organization'
const plan = (process.argv[4] as '1_month' | '3_month' | '6_month') || '6_month'

if (!email) {
  console.error('Please provide an email address')
  console.error('Usage: npx tsx scripts/setup-pro-subscriber.ts <user-email> [organization-name] [plan]')
  process.exit(1)
}

if (!['1_month', '3_month', '6_month'].includes(plan)) {
  console.error('Invalid plan. Must be: 1_month, 3_month, or 6_month')
  process.exit(1)
}

setupProSubscriber(email, orgName, plan)

