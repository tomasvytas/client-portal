import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; filename: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId, filename } = await params

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get asset info
    const asset = await prisma.asset.findFirst({
      where: {
        taskId,
        filename,
      },
    })

    if (!asset) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // If URL is a full URL (Vercel Blob), redirect to it
    if (asset.url.startsWith('http://') || asset.url.startsWith('https://')) {
      return NextResponse.redirect(asset.url)
    }
    
    // Otherwise, read from local filesystem (development only)
    const filePath = join(process.cwd(), 'uploads', taskId, filename)
    
    try {
      const fileBuffer = await readFile(filePath)
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': asset.mimeType,
          'Content-Disposition': `inline; filename="${asset.originalName}"`,
        },
      })
    } catch (error) {
      console.error('Error reading file:', error)
      return NextResponse.json(
        { error: 'File not found on server' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}

