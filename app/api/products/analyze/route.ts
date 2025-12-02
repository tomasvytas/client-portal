import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy initialization for Gemini
let geminiInstance: GoogleGenerativeAI | null = null

function getGemini(): GoogleGenerativeAI {
  if (!geminiInstance) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY environment variable')
    }
    geminiInstance = new GoogleGenerativeAI(apiKey)
  }
  return geminiInstance
}

/**
 * Analyze a product/brand website and generate brand guidelines
 * This replicates the n8n workflow functionality
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, websiteUrl, productName } = body

    // Support both productId (new flow) and websiteUrl (legacy flow)
    if (productId) {
      // New flow: product already exists, just analyze it
      const product = await prisma.product.findUnique({
        where: { id: productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }

      // Verify ownership
      if (product.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }

      // Update status to analyzing
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'analyzing' },
      })

      // Start analysis in background (don't wait)
      if (!product.websiteUrl) {
        await prisma.product.update({
          where: { id: product.id },
          data: { status: 'failed' },
        })
        return NextResponse.json(
          { error: 'Product website URL is missing' },
          { status: 400 }
        )
      }

      analyzeProduct(product.id, product.websiteUrl, product.name || 'Unknown Product').catch((error) => {
        console.error('Error analyzing product:', error)
        prisma.product.update({
          where: { id: product.id },
          data: { status: 'failed' },
        }).catch(console.error)
      })

      return NextResponse.json({
        product,
        message: 'Analysis started. This may take a few minutes.',
      })
    } else if (websiteUrl) {
      // Legacy flow: create product and analyze
      // Create product record
      const product = await prisma.product.create({
        data: {
          userId: session.user.id,
          name: productName || 'Unknown Product',
          websiteUrl,
          status: 'analyzing',
        },
      })

      // Start analysis in background (don't wait)
      analyzeProduct(product.id, websiteUrl, productName).catch((error) => {
        console.error('Error analyzing product:', error)
        prisma.product.update({
          where: { id: product.id },
          data: { status: 'failed' },
        }).catch(console.error)
      })

      return NextResponse.json({
        product,
        message: 'Analysis started. This may take a few minutes.',
      })
    } else {
      return NextResponse.json(
        { error: 'Either productId or websiteUrl is required' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error starting product analysis:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to start analysis' },
      { status: 500 }
    )
  }
}

/**
 * Analyze product website and generate brand guidelines
 */
async function analyzeProduct(
  productId: string,
  websiteUrl: string,
  productName?: string
) {
  try {
    // For now, we'll use a simplified version that analyzes the website
    // In production, you might want to use Firecrawl API or similar
    
    // Fetch website content (simplified - in production use Firecrawl)
    let websiteContent = ''
    try {
      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BrandAnalyzer/1.0)',
        },
      })
      const html = await response.text()
      // Extract text content (simplified - in production use proper HTML parsing)
      websiteContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 10000) // Limit content length
    } catch (error) {
      console.error('Error fetching website:', error)
      websiteContent = `Website URL: ${websiteUrl}\n\nUnable to fetch full content. Please provide more details about the product.`
    }

    // Generate brand guidelines using Gemini (same prompt as n8n workflow)
    const gemini = getGemini()
    // Use gemini-2.5-flash for fast, cost-effective analysis
    // Alternative: gemini-2.5-pro for better quality, gemini-3-pro-preview for best quality
    const model = gemini.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `# ROLE AND GOAL
You are an expert Brand Strategist and Marketing Analyst. Your task is to analyze the provided scraped website content from a company or product and synthesize it into a comprehensive Brand Guidelines document. This document's primary purpose is to serve as the foundational context for an AI-powered advertising system. Therefore, your analysis must be sharp, marketing-focused, and extract actionable insights for creating compelling, on-brand ad copy.

# INSTRUCTIONS
1.  **Adopt the Persona:** Think like a senior marketer building a briefing document for a creative team. Your focus is on clarity, strategy, and actionable direction.
2.  **Deep Analysis:** Do not just summarize. Read all the provided text to identify recurring themes, key phrases, value propositions, product details, and the underlying brand philosophy.
3.  **Infer and Synthesize:** The content may not explicitly state everything. You must infer the target audience, brand voice, and strategic positioning based on the language, features, and benefits presented.
4.  **Structure is Key:** Your output MUST follow the provided Markdown format precisely. This structure is designed to be easily parsed and used for ad generation.
5.  **Focus on Actionability:** Every piece of information should be useful for writing an ad. For example, instead of just saying "the brand is friendly," specify *how* it's friendly (e.g., "Uses conversational language, asks questions, and uses words like 'we' and 'you'").

# OUTPUT FORMAT (Use this exact Markdown structure AND output the final markdown)

# Brand Guidelines: ${productName || '[Company/Product Name - Infer from content]'}

## 1. Executive Summary & Brand Essence
- **Brand Essence (The "Vibe"):** In 1-2 sentences, what is the core feeling or identity of the brand? (e.g., "Innovative and empowering," "Reliable and traditional," "Playful and irreverent").
- **One-Liner Pitch:** If you had to describe what this company does and for whom in a single sentence, what would it be?

## 2. Company & Mission
- **Company Mission/Vision:** What is the stated or implied goal of the company? What future are they trying to create?
- **Core Values:** What principles seem to guide their business and communication? (e.g., Simplicity, Customer-Obsession, Sustainability).
- **Brand Story (if available):** Is there an origin story or narrative they use to connect with customers?

## 3. Target Audience Profile (Inferred)
- **Primary Audience:** Describe the ideal customer. Be specific.
- **Pain Points Addressed:** What specific problems, frustrations, or needs does the brand solve for this audience?
- **Desired Outcomes:** What does the customer achieve or feel after using the product/service? (e.g., "Peace of mind," "Increased productivity," "Sense of belonging").

## 4. Brand Voice & Tone
- **Voice Adjectives (Pick 3-5):** (e.g., Confident, Enthusiastic, Professional, Witty, Empathetic, Direct, Technical).
- **Tone Profile:** Describe the general tone. Is it formal or casual? Serious or humorous? Scientific or simple?
- **Key Phrases & Slogans:** List any recurring taglines, slogans, or unique phrases used throughout the site.
- **Vocabulary/Lexicon:** List specific words or jargon the brand frequently uses (e.g., "synergy," "ecosystem," "seamless," "unlock"). Also, list words they seem to avoid.

## 5. Core Messaging & Value Propositions
- **Unique Selling Proposition (USP):** What is the single most compelling thing that differentiates this brand/product from its competitors?
- **Primary Benefits (The "Why"):** List the top 3-5 emotional and functional benefits for the customer. (e.g., "Save 10 hours per week," "Never worry about data loss again," "Impress your clients").
- **Supporting Features (The "How"):** List the key features that deliver the benefits above.

## 6. Product/Service Breakdown
*(Repeat this section for each distinct product or service identified)*
### Product: [Product/Service Name]
- **Description:** A concise summary of what it is and what it does.
- **Target User:** Who is this specific product for?
- **Primary Use Case:** What is the main job this product is hired to do?

## 7. Strategic Advertising Angles
- **Calls-to-Action (CTAs):** List the common CTAs found on the site (e.g., "Start Your Free Trial," "Request a Demo," "Shop Now," "Learn More").
- **Emotional Hooks:** What emotions does the brand's messaging tap into? (e.g., Fear of Missing Out (FOMO), Aspiration, Trust, Frustration with the status quo).
- **Objection Handlers (Inferred):** How does the website preemptively address customer doubts or competitor claims? (e.g., Mentions of "money-back guarantee," "24/7 support," social proof, transparent pricing).

---

**INPUT:**

Here is the scraped website content. Analyze it and generate the brand guidelines.

${websiteContent}`

    console.log('Starting Gemini analysis for product:', productId)
    const result = await model.generateContent(prompt)
    const response = result.response
    const brandGuidelines = response.text()
    console.log('Gemini analysis completed, length:', brandGuidelines.length)

    // Extract product type from the analysis (try to infer from content)
    const productTypeMatch = brandGuidelines.match(/Product:\s*\[([^\]]+)\]/i)
    const productType = productTypeMatch
      ? productTypeMatch[1]
      : brandGuidelines.match(/One-Liner Pitch:.*?([A-Z][^\.]+)/)?.[1] || null

    // Parse structured data from markdown (simplified extraction)
    const analysisData: any = {
      brandEssence: extractSection(brandGuidelines, 'Brand Essence'),
      targetAudience: extractSection(brandGuidelines, 'Primary Audience'),
      usp: extractSection(brandGuidelines, 'Unique Selling Proposition'),
      voiceAdjectives: extractSection(brandGuidelines, 'Voice Adjectives'),
    }

    // Update product with analysis results
    await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'completed',
        brandGuidelines,
        productType,
        analysisData,
      },
    })

    console.log('Product analysis completed:', productId)
  } catch (error: any) {
    console.error('Error in product analysis:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      productId,
      websiteUrl,
    })
    
    // Update product status to failed with error details
    await prisma.product.update({
      where: { id: productId },
      data: { 
        status: 'failed',
        analysisData: {
          error: error?.message || 'Unknown error occurred',
          timestamp: new Date().toISOString(),
        },
      },
    })
    throw error
  }
}

/**
 * Extract a section from markdown text
 */
function extractSection(markdown: string, sectionName: string): string | null {
  const regex = new RegExp(
    `(?:##|###|\\*\\*).*?${sectionName}[^:]*:([^#\\n]+)`,
    'i'
  )
  const match = markdown.match(regex)
  return match ? match[1].trim() : null
}

