import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'

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
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const uniqueFilename = `${randomUUID()}.${fileExtension}`
    
    // Use Vercel Blob in production, local filesystem in development
    let url: string
    if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN) {
      // Production: Use Vercel Blob
      const bytes = await file.arrayBuffer()
      const blob = await put(`${taskId}/${uniqueFilename}`, bytes, {
        access: 'public',
        contentType: file.type,
      })
      url = blob.url
    } else {
      // Development: Use local filesystem
      const uploadsDir = join(process.cwd(), 'uploads', taskId)
      await mkdir(uploadsDir, { recursive: true })
      const filePath = join(uploadsDir, uniqueFilename)
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      url = `/api/files/${taskId}/${uniqueFilename}`
    }

    // Save to database
    const asset = await prisma.asset.create({
      data: {
        taskId,
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url,
      },
    })

    return NextResponse.json({ asset })
  } catch (error: any) {
    console.error('Error uploading file:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload file', details: error?.stack },
      { status: 500 }
    )
  }
}

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

    const assets = await prisma.asset.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

