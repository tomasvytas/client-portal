import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
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

    const body = await request.json()
    const { title } = body

    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
        title: title || 'New Task',
        clientEmail: session.user.email || undefined,
        clientName: session.user.name || undefined,
      },
    })

    // Create welcome message
    await prisma.message.create({
      data: {
        taskId: task.id,
        role: 'assistant',
        content: `Hello! 👋 I'm here to help you create a new project. Let's start by gathering some information:

1. **What product or service** are you looking to have work done on?
2. **What type of project** is this? (e.g., video production, graphic design, web development, social media content, etc.)
3. **When do you need this completed?** (deadline/timeline)

Feel free to share as much detail as you'd like, and I'll help organize everything. You can also upload any assets or reference materials using the paperclip icon.

If you'd like to know about pricing, just ask! I can provide estimates based on your project details.`,
      },
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

