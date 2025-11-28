import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from './prisma'

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
let openaiInstance: OpenAI | null = null
let geminiInstance: GoogleGenerativeAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('Missing credentials. Please set the OPENAI_API_KEY environment variable.')
    }
    openaiInstance = new OpenAI({
      apiKey,
    })
  }
  return openaiInstance
}

function getGemini(): GoogleGenerativeAI {
  if (!geminiInstance) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Missing credentials. Please set the GEMINI_API_KEY environment variable.')
    }
    geminiInstance = new GoogleGenerativeAI(apiKey)
  }
  return geminiInstance
}

export interface TaskContext {
  taskId: string
  clientName?: string
  clientEmail?: string
  productName?: string
  productDescription?: string
  deadline?: string
  estimatedPrice?: number
  assets?: Array<{ filename: string; url: string }>
  previousMessages?: Array<{ role: string; content: string }>
  imageUrls?: string[] // URLs of images in the current message
}

// Determine what information is still needed
function getMissingInfo(context: TaskContext): string[] {
  const missing: string[] = []
  if (!context.productName) missing.push('product/service name')
  if (!context.productDescription) missing.push('product description')
  if (!context.deadline) missing.push('deadline')
  return missing
}

// Calculate pricing based on job type and complexity
function calculatePrice(jobType: string, description: string): number {
  const lowerDesc = description.toLowerCase()
  let basePrice = 0
  let multiplier = 1

  // Determine base price by job type
  if (lowerDesc.includes('video') || lowerDesc.includes('film') || lowerDesc.includes('animation')) {
    basePrice = 1000
    if (lowerDesc.includes('short') || lowerDesc.includes('simple')) multiplier = 0.5
    if (lowerDesc.includes('complex') || lowerDesc.includes('cinematic') || lowerDesc.includes('professional')) multiplier = 2
  } else if (lowerDesc.includes('graphic') || lowerDesc.includes('design') || lowerDesc.includes('logo')) {
    basePrice = 300
    if (lowerDesc.includes('simple') || lowerDesc.includes('basic')) multiplier = 0.5
    if (lowerDesc.includes('brand') || lowerDesc.includes('identity')) multiplier = 3
  } else if (lowerDesc.includes('web') || lowerDesc.includes('website') || lowerDesc.includes('app')) {
    basePrice = 2000
    if (lowerDesc.includes('landing') || lowerDesc.includes('simple')) multiplier = 0.5
    if (lowerDesc.includes('ecommerce') || lowerDesc.includes('platform')) multiplier = 2.5
  } else if (lowerDesc.includes('social') || lowerDesc.includes('post') || lowerDesc.includes('content')) {
    basePrice = 150
    if (lowerDesc.includes('single') || lowerDesc.includes('one')) multiplier = 1
    if (lowerDesc.includes('campaign') || lowerDesc.includes('multiple')) multiplier = 5
  } else {
    // General creative work
    basePrice = 400
    if (lowerDesc.includes('simple') || lowerDesc.includes('quick')) multiplier = 0.5
    if (lowerDesc.includes('complex') || lowerDesc.includes('extensive')) multiplier = 2
  }

  return Math.round(basePrice * multiplier)
}

// Parse relative dates like "tomorrow", "next week", etc. and convert to ISO date string
function parseRelativeDate(dateString: string): string | null {
  if (!dateString) return null
  
  const lower = dateString.toLowerCase().trim()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Handle common relative date expressions
  if (lower.includes('tomorrow')) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString()
  }
  
  if (lower.includes('today')) {
    return today.toISOString()
  }
  
  if (lower.includes('next week')) {
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek.toISOString()
  }
  
  if (lower.includes('next month')) {
    const nextMonth = new Date(today)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    return nextMonth.toISOString()
  }
  
  if (lower.includes('in ') && lower.includes(' days')) {
    const daysMatch = lower.match(/in (\d+)\s*days?/)
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10)
      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + days)
      return futureDate.toISOString()
    }
  }
  
  if (lower.includes('in ') && lower.includes(' week')) {
    const weeksMatch = lower.match(/in (\d+)\s*weeks?/)
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1], 10)
      const futureDate = new Date(today)
      futureDate.setDate(futureDate.getDate() + (weeks * 7))
      return futureDate.toISOString()
    }
  }
  
  // Try to parse as a regular date
  const parsed = new Date(dateString)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString()
  }
  
  return null
}

/**
 * Get AI response using Gemini for image analysis or ChatGPT for text
 */
export async function getAIResponse(
  userMessage: string,
  context: TaskContext
): Promise<{ response: string; extractedData?: Partial<TaskContext> }> {
  // If images are present, use Gemini for image analysis
  if (context.imageUrls && context.imageUrls.length > 0) {
    return getGeminiResponse(userMessage, context)
  }
  
  // Otherwise, use ChatGPT for regular text conversations
  return getChatGPTResponse(userMessage, context)
}

/**
 * Get response from Gemini (for image analysis)
 */
async function getGeminiResponse(
  userMessage: string,
  context: TaskContext
): Promise<{ response: string; extractedData?: Partial<TaskContext> }> {
  try {
    const gemini = getGemini()
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Fetch images and convert to base64
    const imageParts = await Promise.all(
      (context.imageUrls || []).map(async (url) => {
        try {
          const response = await fetch(url)
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const base64 = buffer.toString('base64')
          
          // Determine MIME type from URL or default to image/jpeg
          let mimeType = 'image/jpeg'
          if (url.includes('.png')) mimeType = 'image/png'
          else if (url.includes('.gif')) mimeType = 'image/gif'
          else if (url.includes('.webp')) mimeType = 'image/webp'
          
          return {
            inlineData: {
              data: base64,
              mimeType,
            },
          }
        } catch (error) {
          console.error('Error fetching image:', error)
          return null
        }
      })
    )

    // Filter out failed image fetches
    const validImageParts = imageParts.filter((img): img is NonNullable<typeof img> => img !== null)

    // Build prompt for Gemini
    const prompt = `You are a professional, friendly client service agent helping with creative projects. 

The user has uploaded ${validImageParts.length} image(s) and said: "${userMessage}"

Please analyze the image(s) and provide:
1. A detailed description of what you see
2. Your professional opinion or feedback
3. Any relevant suggestions or recommendations
4. How this relates to their project (if applicable)

Current project context:
- Product: ${context.productName || 'Not specified'}
- Description: ${context.productDescription || 'Not specified'}
- Deadline: ${context.deadline || 'Not specified'}

Be helpful, professional, and provide constructive feedback. Respond in plain text (no markdown formatting).`

    // Prepare content with images and text
    const parts: any[] = [prompt, ...validImageParts]

    const result = await model.generateContent(parts)
    const response = result.response
    const text = response.text()

    // Clean markdown from response
    const cleanResponse = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .trim()

    return {
      response: cleanResponse,
      extractedData: undefined, // Gemini doesn't extract structured data
    }
  } catch (error: any) {
    console.error('Gemini API error:', error)
    // Fallback to ChatGPT if Gemini fails
    console.log('Falling back to ChatGPT...')
    return getChatGPTResponse(userMessage, context)
  }
}

/**
 * Get response from ChatGPT (for regular text conversations)
 */
async function getChatGPTResponse(
  userMessage: string,
  context: TaskContext
): Promise<{ response: string; extractedData?: Partial<TaskContext> }> {
  // Get conversation history (reduced for speed)
  const messages = await prisma.message.findMany({
    where: { taskId: context.taskId },
    orderBy: { createdAt: 'desc' },
    take: 10, // Last 10 messages for context (reduced from 30 for speed)
  })
  
  // Reverse to get chronological order
  messages.reverse()

  const conversationHistory = messages.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
  }))

  const missingInfo = getMissingInfo(context)
  const hasAssets = context.assets && context.assets.length > 0

  // Get current date and time for context
  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  })

  // Build system prompt
  const systemPrompt = `You are a professional, friendly client service agent helping to collect information about creative projects. 

IMPORTANT: Today's date is ${currentDate}. The current time is ${currentTime}. Always use this information when answering questions about dates or time.

Your role is to:

1. **Ask questions systematically** to gather:
   - Product/service name (if not provided)
   - Detailed product/service description
   - Project deadline/timeline
   - Specific requirements, style preferences, or deliverables
   - Any other relevant details

2. **Provide pricing estimates** when asked. Use these guidelines:
   - Video production: €500-€5000 (simple videos start at €500, complex/cinematic can go up to €5000)
   - Graphic design: €150-€2000 (simple designs €150-€300, brand identity €1000-€2000)
   - Web development: €500-€10000 (landing pages €500-€1500, full websites €2000-€5000, e-commerce €5000+)
   - Social media content: €100-€1000 (single posts €100-€200, campaigns €500-€1000)
   - General creative work: €200-€3000 depending on complexity

3. **Be conversational and natural** - don't sound robotic. Ask one question at a time when gathering information.

4. **When pricing is requested**, provide a specific estimate based on the project description. If details are missing, ask for clarification first.

5. **Acknowledge uploaded assets** - if assets are mentioned, reference them naturally.

Current information collected:
- Client: ${context.clientName || 'Not provided'}
- Product: ${context.productName || 'Not provided'}
- Description: ${context.productDescription || 'Not provided'}
- Deadline: ${context.deadline || 'Not provided'}
- Assets: ${hasAssets ? `${context.assets!.length} file(s) uploaded` : 'None'}
- Estimated Price: ${context.estimatedPrice ? `€${context.estimatedPrice}` : 'Not set'}

${missingInfo.length > 0 ? `Still need to collect: ${missingInfo.join(', ')}` : 'All basic information collected. You can ask for more details or provide pricing.'}

Remember: 
- Respond naturally in plain text (not JSON, not markdown)
- Do NOT use markdown formatting like **bold**, *italic*, or any special characters for emphasis
- Use plain text only - no asterisks, underscores, or other markdown symbols
- Be helpful, professional, and guide the conversation to collect all necessary information.`

  let response: string
  let extractedData: Partial<TaskContext> = {}
  
  try {
    // Make both API calls in parallel for speed
    const [completion, extractionCompletion] = await Promise.all([
      // Main response call
      getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 500, // Reduced for faster responses
      }),
      // Data extraction call (in parallel)
      getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a data extraction assistant. Return only valid JSON." },
          { role: "user", content: `Extract the following information from this user message. Return ONLY a JSON object with these fields (use null if not found):
{
  "clientName": "string or null",
  "clientEmail": "string or null", 
  "productName": "string or null",
  "productDescription": "string or null",
  "deadline": "ISO date string or relative date string (e.g., 'tomorrow', 'next week', 'in 3 days') or null",
  "estimatedPrice": "number or null"
}

User message: "${userMessage}"

Current context: ${JSON.stringify({
  clientName: context.clientName,
  productName: context.productName,
  productDescription: context.productDescription,
  deadline: context.deadline,
})}

IMPORTANT for deadline:
- If the user says "tomorrow", extract it as "tomorrow"
- If the user says "next week", extract it as "next week"
- If the user says "in 3 days", extract it as "in 3 days"
- If the user provides a specific date, extract it as-is
- The system will convert relative dates to ISO format automatically

Only extract NEW information that wasn't already in the context. Return valid JSON only.` },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
        max_tokens: 200, // Reduced for speed
      }),
    ])

    let rawResponse = completion.choices[0]?.message?.content || "I apologize, but I couldn't process that request."
    
    // Remove markdown formatting (**, __, etc.)
    response = rawResponse
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1') // Remove *italic*
      .replace(/__(.*?)__/g, '$1') // Remove __bold__
      .replace(/_(.*?)_/g, '$1') // Remove _italic_
      .replace(/~~(.*?)~~/g, '$1') // Remove ~~strikethrough~~
      .replace(/`(.*?)`/g, '$1') // Remove `code`
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .trim()
    
    // Parse extraction result
    try {
      const extracted = JSON.parse(extractionCompletion.choices[0]?.message?.content || '{}')
    
      if (extracted.clientName) extractedData.clientName = extracted.clientName
      if (extracted.clientEmail) extractedData.clientEmail = extracted.clientEmail
      if (extracted.productName) extractedData.productName = extracted.productName
      if (extracted.productDescription) extractedData.productDescription = extracted.productDescription
      
      // Parse deadline - handle relative dates like "tomorrow"
      if (extracted.deadline) {
        // First try to parse as relative date
        const relativeDate = parseRelativeDate(extracted.deadline)
        if (relativeDate) {
          extractedData.deadline = relativeDate
        } else {
          // If not a relative date, try to parse as ISO date or regular date
          const parsed = new Date(extracted.deadline)
          if (!isNaN(parsed.getTime())) {
            extractedData.deadline = parsed.toISOString()
          }
        }
      }
      
      // Handle pricing - check if user asked about price or mentioned a price
      const lowerMessage = userMessage.toLowerCase()
      if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
        if (extracted.estimatedPrice) {
          extractedData.estimatedPrice = extracted.estimatedPrice
        } else if (context.productName || context.productDescription) {
          // Calculate price based on product description
          const description = context.productDescription || context.productName || ''
          extractedData.estimatedPrice = calculatePrice(description, description)
        }
      }
    } catch (e) {
      // Extraction failed, that's okay - we'll just use the natural response
      console.error('Error parsing extraction data:', e)
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API error: ${error?.message || 'Unknown error'}`)
  }

  return {
    response,
    extractedData: Object.keys(extractedData).length > 0 ? extractedData : undefined,
  }
}

