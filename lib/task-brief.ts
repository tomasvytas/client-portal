import { prisma } from './prisma'
import { setupTaskFolders, uploadDocumentToDrive } from './google-drive'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'

/**
 * Generate a brief document from task data
 */
export async function generateTaskBrief(taskId: string): Promise<void> {
  try {
    // Check if Google Drive is configured
    if (!process.env.GOOGLE_DRIVE_CREDENTIALS || !process.env.GOOGLE_DRIVE_BASE_FOLDER_ID) {
      console.log('Google Drive not configured, skipping brief generation')
      console.log('GOOGLE_DRIVE_CREDENTIALS:', !!process.env.GOOGLE_DRIVE_CREDENTIALS)
      console.log('GOOGLE_DRIVE_BASE_FOLDER_ID:', !!process.env.GOOGLE_DRIVE_BASE_FOLDER_ID)
      return
    }

    console.log('Generating task brief for task:', taskId)

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
    console.log('Setting up task folders for:', taskName)
    const { taskFolderId } = await setupTaskFolders(taskName)
    console.log('Task folder ID:', taskFolderId)

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

    // Generate brief document using docx
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'PROJECT BRIEF',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Task Information Section
          new Paragraph({
            text: 'TASK INFORMATION',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Task ID: ', bold: true }),
              new TextRun({ text: task.id }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Title: ', bold: true }),
              new TextRun({ text: task.title || 'Untitled Task' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Status: ', bold: true }),
              new TextRun({ text: task.status.replace('_', ' ').toUpperCase() }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Created: ', bold: true }),
              new TextRun({ text: formatDate(task.createdAt) }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Last Updated: ', bold: true }),
              new TextRun({ text: formatDate(task.updatedAt) }),
            ],
            spacing: { after: 200 },
          }),
          
          ...(task.productName ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Product/Service: ', bold: true }),
                new TextRun({ text: task.productName }),
              ],
            }),
          ] : []),
          
          ...(task.productDescription ? [
            new Paragraph({
              text: 'Description:',
              spacing: { before: 200 },
            }),
            new Paragraph({
              text: task.productDescription,
              spacing: { after: 200 },
            }),
          ] : []),
          
          // Client Information Section
          new Paragraph({
            text: 'CLIENT INFORMATION',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Name: ', bold: true }),
              new TextRun({ text: task.clientName || task.user.name || 'Not provided' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Email: ', bold: true }),
              new TextRun({ text: task.clientEmail || task.user.email || 'Not provided' }),
            ],
            spacing: { after: 200 },
          }),
          
          // Project Details Section
          new Paragraph({
            text: 'PROJECT DETAILS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Deadline: ', bold: true }),
              new TextRun({ text: formatDate(task.deadline) }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Estimated Price: ', bold: true }),
              new TextRun({ text: formatPrice(task.estimatedPrice) }),
            ],
          }),
          ...(task.finalPrice ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Final Price: ', bold: true }),
                new TextRun({ text: formatPrice(task.finalPrice) }),
              ],
            }),
          ] : []),
          
          // Links Section
          ...(links.size > 0 ? [
            new Paragraph({
              text: 'LINKS',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
            ...Array.from(links).map(link => 
              new Paragraph({
                text: `• ${link}`,
                bullet: { level: 0 },
              })
            ),
          ] : []),
          
          // Assets Section
          new Paragraph({
            text: 'ASSETS',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Total Assets: ', bold: true }),
              new TextRun({ text: task.assets.length.toString() }),
            ],
          }),
          ...(task.assets.length > 0 ? task.assets.map(asset => 
            new Paragraph({
              text: `• ${asset.originalName} (${(asset.size / 1024).toFixed(1)} KB)`,
              bullet: { level: 0 },
            })
          ) : [
            new Paragraph({
              text: 'No assets uploaded',
            }),
          ]),
          
          // Conversation Summary Section
          new Paragraph({
            text: 'CONVERSATION SUMMARY',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Total Messages: ', bold: true }),
              new TextRun({ text: task.messages.length.toString() }),
            ],
            spacing: { after: 200 },
          }),
          
          ...(task.messages.length > 0 ? task.messages.flatMap((msg, idx) => {
            const role = msg.role === 'user' ? 'CLIENT' : 'AI ASSISTANT'
            const timestamp = formatDate(msg.createdAt)
            return [
              new Paragraph({
                children: [
                  new TextRun({ text: `[${idx + 1}] ${role} (${timestamp}):`, bold: true }),
                ],
                spacing: { before: 200 },
              }),
              new Paragraph({
                text: msg.content,
                spacing: { after: 200 },
              }),
            ]
          }) : [
            new Paragraph({
              text: 'No messages yet',
            }),
          ]),
          
          // Footer
          new Paragraph({
            text: `Generated: ${new Date().toLocaleString('en-US', { 
              dateStyle: 'full', 
              timeStyle: 'long' 
            })}`,
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
          }),
        ],
      }],
    })

    // Generate document buffer
    const buffer = await Packer.toBuffer(doc)

    // Upload brief to Google Drive
    console.log('Uploading brief document to Google Drive...')
    const briefResult = await uploadDocumentToDrive(
      buffer,
      `Brief - ${taskName}.docx`,
      taskFolderId,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    console.log('Brief uploaded successfully, fileId:', briefResult.fileId)
    console.log('Brief URL:', briefResult.webViewLink)
    console.log('Task brief generated and uploaded to Google Drive')
  } catch (error: any) {
    console.error('Error generating task brief:', error)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error response:', error?.response?.data)
    console.error('Error stack:', error?.stack)
    // Don't throw - brief generation failure shouldn't break the main flow
  }
}

