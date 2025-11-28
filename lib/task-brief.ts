import { prisma } from './prisma'
import { setupTaskFolders, uploadDocumentToDrive } from './google-drive'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, WidthType, Table, TableRow, TableCell, BorderStyle } from 'docx'
import OpenAI from 'openai'

// Lazy initialization for OpenAI
let openaiInstance: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable')
    }
    openaiInstance = new OpenAI({ apiKey })
  }
  return openaiInstance
}

/**
 * Generate a concise summary of the conversation
 */
async function generateChatSummary(messages: Array<{ role: string; content: string }>): Promise<string> {
  if (messages.length === 0) {
    return 'No conversation yet.'
  }

  try {
    const openai = getOpenAI()
    
    // Prepare conversation for summarization
    const conversationText = messages
      .map(msg => `${msg.role === 'user' ? 'Client' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional assistant that creates concise, well-structured summaries of client conversations. Focus on key decisions, requirements, deliverables, and important details. Write in a professional, clear manner suitable for a corporate brief document.',
        },
        {
          role: 'user',
          content: `Please provide a concise summary of this client conversation. Focus on:
- Key project requirements and objectives
- Important decisions made
- Deliverables and expectations
- Timeline and deadlines mentioned
- Budget and pricing discussed
- Any specific preferences or constraints

Conversation:
${conversationText}

Provide a well-structured summary in 2-4 paragraphs.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    return response.choices[0]?.message?.content || 'Unable to generate summary.'
  } catch (error: any) {
    console.error('Error generating chat summary:', error)
    // Fallback to a simple summary
    const userMessages = messages.filter(m => m.role === 'user').length
    const assistantMessages = messages.filter(m => m.role === 'assistant').length
    return `Conversation includes ${userMessages} client messages and ${assistantMessages} assistant responses. Key details are captured in the project information above.`
  }
}

/**
 * Generate a brief document from task data
 */
export async function generateTaskBrief(taskId: string): Promise<void> {
  try {
    // Check if Google Drive is configured (OAuth or service account)
    const hasOAuth = process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET && process.env.GOOGLE_DRIVE_REFRESH_TOKEN
    const hasServiceAccount = process.env.GOOGLE_DRIVE_CREDENTIALS
    const hasBaseFolder = process.env.GOOGLE_DRIVE_BASE_FOLDER_ID

    if ((!hasOAuth && !hasServiceAccount) || !hasBaseFolder) {
      console.log('Google Drive not configured, skipping brief generation')
      console.log('OAuth configured:', !!hasOAuth)
      console.log('Service account configured:', !!hasServiceAccount)
      console.log('Base folder ID:', !!hasBaseFolder)
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

    // Generate chat summary
    console.log('Generating chat summary...')
    const chatSummary = await generateChatSummary(
      task.messages.map(m => ({ role: m.role, content: m.content }))
    )

    // Define professional font and styling
    const titleStyle = {
      size: 36,
      bold: true,
      color: '1D1D1F',
    }

    const headingStyle = {
      size: 24,
      bold: true,
      color: '1D1D1F',
    }

    const bodyStyle = {
      size: 22,
      color: '1D1D1F',
    }

    const labelStyle = {
      size: 22,
      bold: true,
      color: '1D1D1F',
    }

    const secondaryStyle = {
      size: 20,
      color: '6E6E73',
    }

    // Generate brief document using docx with professional formatting
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'SF Pro Display',
              size: 22,
              color: '1D1D1F',
            },
            paragraph: {
              spacing: { line: 360, lineRule: 'auto' },
            },
          },
        },
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1080, // 0.75 inch
              bottom: 1440,
              left: 1080, // 0.75 inch - narrower margins for wider tables
            },
          },
        },
        children: [
          // Title with elegant spacing
          new Paragraph({
            children: [
              new TextRun({
                text: 'Project Brief',
                ...titleStyle,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          
          // Subtle divider
          new Paragraph({
            children: [
              new TextRun({
                text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                color: 'D2D2D7',
                size: 18,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
          }),
          
          // Project Overview Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'Project Overview',
                ...headingStyle,
              }),
            ],
            spacing: { before: 400, after: 400 },
          }),

          // Project details in a clean table format
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4500, 4500], // Split evenly: 50/50
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Project Title',
                            ...labelStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                    shading: { fill: 'F5F5F7' },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: task.title || task.productName || 'Untitled Project',
                            ...bodyStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                  }),
                ],
              }),
              ...(task.productName ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: 'Product/Service',
                              ...labelStyle,
                            }),
                          ],
                          spacing: { after: 200 },
                        }),
                      ],
                      shading: { fill: 'F5F5F7' },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: task.productName,
                              ...bodyStyle,
                            }),
                          ],
                          spacing: { after: 200 },
                        }),
                      ],
                    }),
                  ],
                }),
              ] : []),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Status',
                            ...labelStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                    shading: { fill: 'F5F5F7' },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: task.status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                            ...bodyStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Created',
                            ...labelStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                    shading: { fill: 'F5F5F7' },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: formatDate(task.createdAt),
                            ...secondaryStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          ...(task.productDescription ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Description',
                  ...headingStyle,
                }),
              ],
              spacing: { before: 600, after: 300 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: task.productDescription,
                  ...bodyStyle,
                }),
              ],
              spacing: { after: 400 },
            }),
          ] : []),
          
          // Client Information Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'Client Information',
                ...headingStyle,
              }),
            ],
            spacing: { before: 600, after: 400 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4500, 4500], // Split evenly: 50/50
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Name',
                            ...labelStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                    shading: { fill: 'F5F5F7' },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: task.clientName || task.user.name || 'Not provided',
                            ...bodyStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Email',
                            ...labelStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                    shading: { fill: 'F5F5F7' },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: task.clientEmail || task.user.email || 'Not provided',
                            ...bodyStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          
          // Project Details Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'Project Details',
                ...headingStyle,
              }),
            ],
            spacing: { before: 600, after: 400 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4500, 4500], // Split evenly: 50/50
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D2D2D7' },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Deadline',
                            ...labelStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                    shading: { fill: 'F5F5F7' },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: formatDate(task.deadline),
                            ...bodyStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: 'Estimated Price',
                            ...labelStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                    shading: { fill: 'F5F5F7' },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: formatPrice(task.estimatedPrice),
                            ...bodyStyle,
                          }),
                        ],
                        spacing: { after: 200 },
                      }),
                    ],
                  }),
                ],
              }),
              ...(task.finalPrice ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: 'Final Price',
                              ...labelStyle,
                            }),
                          ],
                          spacing: { after: 200 },
                        }),
                      ],
                      shading: { fill: 'F5F5F7' },
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: formatPrice(task.finalPrice),
                              ...bodyStyle,
                            }),
                          ],
                          spacing: { after: 200 },
                        }),
                      ],
                    }),
                  ],
                }),
              ] : []),
            ],
          }),
          
          // Links Section
          ...(links.size > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Reference Links',
                  ...headingStyle,
                }),
              ],
              spacing: { before: 600, after: 300 },
            }),
            ...Array.from(links).map(link => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: '• ',
                    ...bodyStyle,
                  }),
                  new TextRun({
                    text: link,
                    ...bodyStyle,
                    color: '007AFF',
                  }),
                ],
                spacing: { after: 200 },
              })
            ),
            new Paragraph({
              spacing: { after: 400 },
            }),
          ] : []),
          
          // Assets Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'Assets',
                ...headingStyle,
              }),
            ],
            spacing: { before: 600, after: 300 },
          }),
          ...(task.assets.length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${task.assets.length} file${task.assets.length !== 1 ? 's' : ''} uploaded`,
                  ...secondaryStyle,
                }),
              ],
              spacing: { after: 200 },
            }),
            ...task.assets.map(asset => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: '• ',
                    ...bodyStyle,
                  }),
                  new TextRun({
                    text: asset.originalName,
                    ...bodyStyle,
                  }),
                  new TextRun({
                    text: ` (${(asset.size / 1024).toFixed(1)} KB)`,
                    ...secondaryStyle,
                  }),
                ],
                spacing: { after: 150 },
              })
            ),
          ] : [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'No assets uploaded',
                  ...secondaryStyle,
                }),
              ],
            }),
          ]),
          
          // Conversation Summary Section
          new Paragraph({
            children: [
              new TextRun({
                text: 'Conversation Summary',
                ...headingStyle,
              }),
            ],
            spacing: { before: 600, after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${task.messages.length} message${task.messages.length !== 1 ? 's' : ''} exchanged`,
                ...secondaryStyle,
              }),
            ],
            spacing: { after: 400 },
          }),
          
          // AI-generated summary
          new Paragraph({
            children: [
              new TextRun({
                text: chatSummary,
                ...bodyStyle,
              }),
            ],
            spacing: { after: 400 },
          }),
          
          // Footer with elegant styling
          new Paragraph({
            spacing: { before: 800 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                color: 'D2D2D7',
                size: 18,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated ${new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}`,
                ...secondaryStyle,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
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

