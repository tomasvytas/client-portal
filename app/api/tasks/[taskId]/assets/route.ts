import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { v2 as cloudinary } from 'cloudinary'
import { setupTaskFolders, uploadFileToDrive, getFileShareableLink } from '@/lib/google-drive'

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
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Priority: Google Drive > Cloudinary > Local filesystem
    let url: string | undefined = undefined
    let metadata: any = {}
    
    if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
      // Priority 1: Use Google Drive
      try {
        // Setup folder structure: Task Name > Assets
        const taskName = task.title || task.productName || `Task ${taskId}`
        const assetsFolderId = await setupTaskFolders(taskName)
        
        // Upload file to Google Drive
        const driveResult = await uploadFileToDrive(
          buffer,
          file.name,
          file.type,
          assetsFolderId
        )
        
        // Get shareable link
        url = await getFileShareableLink(driveResult.fileId)
        
        // Store Google Drive file ID in metadata
        metadata = {
          googleDriveFileId: driveResult.fileId,
          googleDriveFolderId: assetsFolderId,
          storageType: 'google-drive',
        }
      } catch (error: any) {
        console.error('Google Drive upload failed:', error)
        console.error('Error message:', error?.message)
        console.error('Error stack:', error?.stack)
        // Fall through to Cloudinary or local storage
      }
    }
    
    // Fallback to Cloudinary if Google Drive failed or not configured
    if (!url && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      })
      
      const base64 = buffer.toString('base64')
      const dataUri = `data:${file.type};base64,${base64}`
      
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: `client-portal/${taskId}`,
        public_id: uniqueFilename.replace(`.${fileExtension}`, ''),
        resource_type: 'auto',
      })
      
      url = result.secure_url
      metadata = {
        ...metadata,
        storageType: 'cloudinary',
      }
    }
    
    // Fallback to local filesystem if neither Google Drive nor Cloudinary is available
    if (!url) {
      const uploadsDir = join(process.cwd(), 'uploads', taskId)
      await mkdir(uploadsDir, { recursive: true })
      const filePath = join(uploadsDir, uniqueFilename)
      await writeFile(filePath, buffer)
      url = `/api/files/${taskId}/${uniqueFilename}`
      metadata = {
        ...metadata,
        storageType: 'local',
      }
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
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
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

