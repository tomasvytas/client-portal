import { prisma } from './prisma'
import { setupTaskFolders, uploadTextDocumentToDrive } from './google-drive'

/**
 * Generate a brief document from task data
 */
export async function generateTaskBrief(taskId: string): Promise<void> {
  try {
    // Check if Google Drive is configured
    if (!process.env.GOOGLE_DRIVE_CREDENTIALS || !process.env.GOOGLE_DRIVE_BASE_FOLDER_ID) {
      console.log('Google Drive not configured, skipping brief generation')
      return
    }

    // Fetch full task data
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
      },
    })

    if (!task) {
      console.error('Task not found for brief generation:', taskId)
      return
    }

    // Get task folder structure
    const taskName = task.title || task.productName || `Task ${taskId}`
    const { taskFolderId } = await setupTaskFolders(taskName)

    // Extract links from messages
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const links = new Set<string>()
    task.messages.forEach(message => {
      const matches = message.content.match(urlRegex)
      if (matches) {
        matches.forEach(url => links.add(url))
      }
    })

    // Format dates
    const formatDate = (date: Date | null) => {
      if (!date) return 'Not set'
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    const formatPrice = (price: any) => {
      if (!price) return 'Not set'
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
      }).format(Number(price))
    }

    // Generate brief content
    const brief = `PROJECT BRIEF
${'='.repeat(80)}

TASK INFORMATION
${'-'.repeat(80)}
Task ID: ${task.id}
Title: ${task.title || 'Untitled Task'}
Status: ${task.status.replace('_', ' ').toUpperCase()}
Created: ${formatDate(task.createdAt)}
Last Updated: ${formatDate(task.updatedAt)}

${task.productName ? `Product/Service: ${task.productName}` : ''}
${task.productDescription ? `\nDescription:\n${task.productDescription}` : ''}

CLIENT INFORMATION
${'-'.repeat(80)}
Name: ${task.clientName || task.user.name || 'Not provided'}
Email: ${task.clientEmail || task.user.email || 'Not provided'}

PROJECT DETAILS
${'-'.repeat(80)}
Deadline: ${formatDate(task.deadline)}
Estimated Price: ${formatPrice(task.estimatedPrice)}
${task.finalPrice ? `Final Price: ${formatPrice(task.finalPrice)}` : ''}

${links.size > 0 ? `LINKS\n${'-'.repeat(80)}\n${Array.from(links).map(link => `- ${link}`).join('\n')}\n` : ''}

ASSETS
${'-'.repeat(80)}
Total Assets: ${task.assets.length}
${task.assets.length > 0 ? task.assets.map(asset => `- ${asset.originalName} (${(asset.size / 1024).toFixed(1)} KB)`).join('\n') : 'No assets uploaded'}

CONVERSATION SUMMARY
${'-'.repeat(80)}
Total Messages: ${task.messages.length}

${task.messages.length > 0 ? task.messages.map((msg, idx) => {
  const role = msg.role === 'user' ? 'CLIENT' : 'AI ASSISTANT'
  const timestamp = formatDate(msg.createdAt)
  return `[${idx + 1}] ${role} (${timestamp}):\n${msg.content}\n`
}).join('\n') : 'No messages yet'}

${'='.repeat(80)}
Generated: ${new Date().toLocaleString('en-US', { 
  dateStyle: 'full', 
  timeStyle: 'long' 
})}
`

    // Upload brief to Google Drive
    await uploadTextDocumentToDrive(
      brief,
      `Brief - ${taskName}.txt`,
      taskFolderId
    )

    console.log('Task brief generated and uploaded to Google Drive')
  } catch (error: any) {
    console.error('Error generating task brief:', error)
    // Don't throw - brief generation failure shouldn't break the main flow
  }
}

