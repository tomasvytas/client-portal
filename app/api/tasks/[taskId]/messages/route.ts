import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAIResponse } from '@/lib/ai-agent'
import { generateTaskBrief } from '@/lib/task-brief'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const messages = await prisma.message.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    })

    // Extract image URLs from metadata
    const messagesWithImages = messages.map(msg => ({
      ...msg,
      images: (msg.metadata as any)?.imageUrls || undefined,
    }))

    return NextResponse.json({ messages: messagesWithImages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
      include: {
        assets: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await request.json()
    const { content, imageUrls } = body

    if (!content && (!imageUrls || imageUrls.length === 0)) {
      return NextResponse.json(
        { error: 'Message content or images are required' },
        { status: 400 }
      )
    }

    // Save user message with image URLs in metadata
    const userMessage = await prisma.message.create({
      data: {
        taskId,
        role: 'user',
        content: content || '(sent images)',
        metadata: imageUrls && imageUrls.length > 0 ? { imageUrls } : undefined,
      },
    })

    // Get AI response
    const context = {
      taskId,
      clientName: task.clientName || undefined,
      clientEmail: task.clientEmail || undefined,
      productName: task.productName || undefined,
      productDescription: task.productDescription || undefined,
      deadline: task.deadline?.toISOString(),
      estimatedPrice: task.estimatedPrice ? Number(task.estimatedPrice) : undefined,
      assets: task.assets.map(a => ({
        filename: a.filename,
        url: a.url,
      })),
      previousMessages: task.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }

    const { response, extractedData } = await getAIResponse(content, context)

    // Save AI response
    const aiMessage = await prisma.message.create({
      data: {
        taskId,
        role: 'assistant',
        content: response,
      },
    })

    // Update task with extracted data if any
    if (extractedData && Object.keys(extractedData).length > 0) {
      const updateData: any = {}
      if (extractedData.clientName) updateData.clientName = extractedData.clientName
      if (extractedData.clientEmail) updateData.clientEmail = extractedData.clientEmail
      if (extractedData.productName) {
        updateData.productName = extractedData.productName
        // Update title if it's still generic
        const genericTitles = ['New Task', 'New Task Chat', 'Untitled Task', null]
        if (genericTitles.includes(task.title)) {
          updateData.title = extractedData.productName
        }
      }
      if (extractedData.productDescription) updateData.productDescription = extractedData.productDescription
      if (extractedData.deadline) updateData.deadline = new Date(extractedData.deadline)
      if (extractedData.estimatedPrice) updateData.estimatedPrice = extractedData.estimatedPrice

      if (Object.keys(updateData).length > 0) {
        await prisma.task.update({
          where: { id: taskId },
          data: updateData,
        })
        
        // Generate and upload brief document to Google Drive (async, don't wait)
        generateTaskBrief(taskId).catch(err => {
          console.error('Failed to generate task brief:', err)
        })
      }
    }

    // Include image URLs in response
    const userMessageWithImages = {
      ...userMessage,
      images: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
    }

    return NextResponse.json({
      userMessage: userMessageWithImages,
      aiMessage,
    })
  } catch (error: any) {
    console.error('Error sending message:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { error: 'Failed to send message', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

