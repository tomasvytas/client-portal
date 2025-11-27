import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import OpenAI from 'openai'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    await requireAdmin()

    const { assetId } = await params
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { task: true },
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Check if it's an image
    if (!asset.mimeType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Asset is not an image' },
        { status: 400 }
      )
    }

    // Read the image file
    let imageBuffer: Buffer
    if (asset.url.startsWith('http://') || asset.url.startsWith('https://')) {
      // Cloudinary or external URL - fetch it
      const response = await fetch(asset.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else {
      // Local filesystem (development)
      const filePath = join(process.cwd(), 'uploads', asset.taskId, asset.filename)
      imageBuffer = await readFile(filePath)
    }
    const base64Image = imageBuffer.toString('base64')

    // Analyze image with OpenAI Vision API
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and provide structured JSON:
{
  "extractedText": "All visible text from the image, formatted with line breaks where appropriate",
  "description": "Detailed description with proper formatting and structure",
  "isMetaAd": boolean,
  "metaAdDetails": {
    "content": "Ad content description",
    "targetAudience": "Target audience description",
    "keyMessaging": "Key messaging points"
  },
  "otherDetails": "Any other relevant information"
}

IMPORTANT: Format extractedText and description with proper line breaks (\n) for readability. Use bullet points or numbered lists where appropriate.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${asset.mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    })

    const analysisText = response.choices[0]?.message?.content || '{}'
    let analysis
    try {
      // Try to parse as JSON
      analysis = JSON.parse(analysisText)
    } catch {
      // If not JSON, create a structured response
      analysis = {
        extractedText: '',
        description: analysisText,
        isMetaAd: false,
        metaAdDetails: null,
        otherDetails: '',
      }
    }

    // Update asset with analysis in metadata
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        metadata: analysis,
      },
    })

    return NextResponse.json({ analysis, asset: updatedAsset })
  } catch (error: any) {
    console.error('Error analyzing image:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze image' },
      { status: 500 }
    )
  }
}

