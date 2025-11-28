import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { setupTaskFolders } from '@/lib/google-drive'
import { getDrive } from '@/lib/google-drive'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await requireAdmin()

    const { taskId } = await params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        assets: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            messages: true,
            assets: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get Google Drive folder and brief document links
    let googleDriveFolderLink: string | null = null
    let briefDocumentLink: string | null = null

    try {
      const taskName = task.title || task.productName || `Task ${taskId}`
      const { taskFolderId } = await setupTaskFolders(taskName)
      
      // Create folder link
      googleDriveFolderLink = `https://drive.google.com/drive/folders/${taskFolderId}`

      // Try to find the brief document in the folder
      const drive = getDrive()
      const briefFileName = `Brief - ${taskName}.docx`
      
      const files = await drive.files.list({
        q: `name='${briefFileName.replace(/'/g, "\\'")}' and '${taskFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, webViewLink)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
      })

      if (files.data.files && files.data.files.length > 0) {
        const briefFile = files.data.files[0]
        briefDocumentLink = briefFile.webViewLink || `https://drive.google.com/file/d/${briefFile.id}/view`
      }
    } catch (error: any) {
      console.error('Error getting Google Drive links:', error)
      // Don't fail the request if Google Drive lookup fails
    }

    return NextResponse.json({
      task: {
        ...task,
        googleDriveFolderLink,
        briefDocumentLink,
      },
    })
  } catch (error: any) {
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching task details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task details' },
      { status: 500 }
    )
  }
}
