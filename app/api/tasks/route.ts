import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTaskBrief } from '@/lib/task-brief'
import { getUserOrganizationIds } from '@/lib/organization'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isMasterAdmin: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Determine role (master_admin takes precedence)
    const userRole = user.isMasterAdmin ? 'master_admin' : user.role

    // Get organization IDs for filtering
    const organizationIds = await getUserOrganizationIds(session.user.id, userRole)

    // Build where clause
    let whereClause: any = {}

    if (organizationIds === null) {
      // Master admin - see all tasks
      whereClause = {}
    } else if (organizationIds.length === 0) {
      // No organizations - return empty
      return NextResponse.json({ tasks: [] })
    } else if (userRole === 'service_provider') {
      // Service provider - see all tasks from their organization
      whereClause = {
        organizationId: { in: organizationIds },
      }
    } else {
      // Client - see only their own tasks from their organizations
      whereClause = {
        userId: session.user.id,
        organizationId: { in: organizationIds },
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Just to check if there are messages
        },
        assets: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, organizationId } = body

    // Get organization ID for the task
    let finalOrganizationId: string | null = null

    if (user.role === 'client') {
      // If organizationId is provided, validate it belongs to the client
      if (organizationId) {
        const clientProvider = await prisma.clientProvider.findUnique({
          where: {
            clientId_organizationId: {
              clientId: session.user.id,
              organizationId: organizationId,
            },
          },
        })
        if (!clientProvider) {
          return NextResponse.json(
            { error: 'Invalid organization ID or you are not linked to this provider' },
            { status: 400 }
          )
        }
        finalOrganizationId = organizationId
      } else {
        // Default to primary organization
        const clientProviders = await prisma.clientProvider.findFirst({
          where: { clientId: session.user.id },
          orderBy: { joinedAt: 'asc' },
          select: { organizationId: true },
        })
        finalOrganizationId = clientProviders?.organizationId || null

        if (!finalOrganizationId) {
          return NextResponse.json(
            { error: 'Client must be linked to a service provider organization' },
            { status: 400 }
          )
        }
      }
    } else if (user.role === 'service_provider') {
      // Service provider - link to their owned organization
      const organization = await prisma.organization.findUnique({
        where: { ownerId: session.user.id },
        select: { id: true },
      })
      finalOrganizationId = organization?.id || null
    }
    // Master admin can create tasks without organization (for testing/admin purposes)

    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
        organizationId: finalOrganizationId,
        title: title || 'New Task',
        clientEmail: session.user.email || undefined,
        clientName: session.user.name || undefined,
      },
    })

    // Create welcome message with fun Kato greeting (randomized variations)
    const katoGreetings = [
      `Heyoo! I'm Kato — Tomas's AI sidekick.

My mission? Collect every task, idea, and chaotic brainwave you've got.

Don't hold back. I've seen some of Tomas's ideas... trust me, yours can't be worse.

So... What's the product?`,
      `Hey there! Kato here — Tomas's AI assistant (and occasional sanity checker).

Ready to turn your wild ideas into actual projects? Let's do this.

I've heard everything from "make it pop" to "just make it work" — so don't worry about being too specific. Or too vague. I've seen it all.

What product are we working with?`,
      `Yo! Kato speaking — Tomas's digital sidekick.

I'm here to gather all the details, deadlines, and delightful chaos that comes with creative projects.

Pro tip: The more you tell me, the better I can help. And yes, I've definitely heard weirder requests than whatever you're about to say.

So, what's the product?`,
      `Heyoo! Kato here — Tomas's AI assistant.

My job? Turn your ideas into organized, actionable briefs. Your job? Tell me everything.

I won't judge. I've seen Tomas's notes... trust me, I've seen worse.

What product are we building?`,
      `Hello! I'm Kato — Tomas's AI sidekick.

Ready to turn your project ideas into reality? Let's start by getting all the details.

Don't worry about being too detailed or too brief — I'll figure it out. I've handled everything from "make it awesome" to 50-page specifications.

What's the product?`,
    ]
    
    const randomGreeting = katoGreetings[Math.floor(Math.random() * katoGreetings.length)]
    
    await prisma.message.create({
      data: {
        taskId: task.id,
        role: 'assistant',
        content: randomGreeting,
      },
    })

    // Generate initial brief document (async, don't wait)
    generateTaskBrief(task.id).catch(err => {
      console.error('Failed to generate initial task brief:', err)
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

