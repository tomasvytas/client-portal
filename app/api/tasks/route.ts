import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTaskBrief } from '@/lib/task-brief'

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

