import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import OpenAI from 'openai'
import { get } from '@vercel/blob'

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
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      // Vercel Blob URL - fetch it
      const blob = await get(asset.url)
      imageBuffer = Buffer.from(await blob.arrayBuffer())
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
              text: `Analyze this image and provide:
1. All text visible in the image (OCR) - extract every word you can see
2. A detailed description of what the image shows
3. If this appears to be an advertisement for Meta (Facebook/Instagram), identify it and describe the ad content, target audience, and key messaging
4. Any other relevant details about the image

Format your response as JSON with these fields:
- extractedText: string (all text found in the image)
- description: string (detailed description)
- isMetaAd: boolean (true if this is a Meta ad)
- metaAdDetails: object (if isMetaAd is true, include: content, targetAudience, keyMessaging)
- otherDetails: string (any other relevant information)`,
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
      max_tokens: 1000,
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

