'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Paperclip, Send, X } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
  images?: string[] // URLs of images attached to this message
}

interface Task {
  id: string
  title: string | null
  status: string
  clientName: string | null
  productName: string | null
  deadline: string | null
  estimatedPrice: number | null
}

interface Asset {
  id: string
  originalName: string
  url: string
  mimeType: string
}

export default function ChatInterface({
  taskId,
  initialTask,
}: {
  taskId: string
  initialTask: Task
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [assets, setAssets] = useState<Asset[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchMessages()
    fetchAssets()
  }, [taskId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`)
      const data = await res.json()
      // Messages already have images extracted from metadata by the API
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const fetchAssets = async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/assets`)
      const data = await res.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Error fetching assets:', error)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!input.trim() && selectedImages.length === 0) || loading) return

    const userMessage = input.trim()
    const imagesToUpload = [...selectedImages]
    setInput('')
    setSelectedImages([])
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setLoading(true)

    // Upload images first if any
    const uploadedImageUrls: string[] = []
    if (imagesToUpload.length > 0) {
      try {
        for (const image of imagesToUpload) {
          const formData = new FormData()
          formData.append('file', image)
          
          const uploadRes = await fetch(`/api/tasks/${taskId}/assets`, {
            method: 'POST',
            body: formData,
          })
          
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            if (uploadData.asset) {
              uploadedImageUrls.push(uploadData.asset.url)
              setAssets((prev) => [uploadData.asset, ...prev])
            }
          }
        }
      } catch (error) {
        console.error('Error uploading images:', error)
        // Continue with message even if image upload fails
      }
    }

    // Optimistically add user message with images
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage || '(sent images)',
      createdAt: new Date().toISOString(),
      images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: userMessage || '(sent images)',
          imageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      
      if (data.userMessage && data.aiMessage) {
        // Replace temp message with real one and add AI response
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== tempUserMessage.id)
          return [...filtered, data.userMessage, data.aiMessage]
        })
      } else {
        // Remove temp message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
        alert('Failed to send message. Please try again.')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
      const errorMessage = error?.message || 'Failed to send message. Please try again.'
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...imageFiles])
    }
    
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  if (loadingMessages) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading chat...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#000000]">
      {/* Header */}
      <div className="bg-[#1C1C1E] border-b border-[#38383A]/50 px-6 py-4 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={() => router.push('/')}
              className="p-2.5 hover:bg-[#2C2C2E] rounded-xl transition-all duration-200 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-[#FFFFFF]" />
            </button>
            <div>
              <h1 className="text-[20px] font-semibold text-[#FFFFFF] leading-tight tracking-tight">
                {initialTask.productName || initialTask.title || 'Task Chat'}
              </h1>
              {initialTask.productName && initialTask.title && initialTask.title !== initialTask.productName && (
                <p className="text-[15px] text-[#8E8E93] mt-0.5">{initialTask.title}</p>
              )}
            </div>
          </div>
          {initialTask.estimatedPrice && (
              <div className="text-right">
              <div className="text-[13px] text-[#8E8E93] font-medium mb-1">Estimated Price</div>
              <div className="text-[20px] font-semibold text-[#30D158]">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(Number(initialTask.estimatedPrice))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#FFFFFF] text-[17px] font-medium mb-2">Start a conversation</p>
              <p className="text-[15px] text-[#8E8E93]">
                Ask about your project, upload assets, or get a price estimate
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-5 py-3.5 ${
                    message.role === 'user'
                      ? 'bg-[#007AFF] text-[#FFFFFF]'
                      : 'bg-[#1C1C1E] text-[#FFFFFF] border border-[#38383A]/30'
                  }`}
                  style={{
                    boxShadow: message.role === 'user' 
                      ? '0 2px 8px rgba(0, 122, 255, 0.2)' 
                      : '0 2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  {message.images && message.images.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {message.images.map((imageUrl, idx) => (
                        <img
                          key={idx}
                          src={imageUrl}
                          alt={`Attachment ${idx + 1}`}
                          className="max-w-[200px] max-h-[200px] rounded-xl object-cover border border-[#38383A]/30"
                          onClick={() => window.open(imageUrl, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                  )}
                  {message.content && (
                    <p className="whitespace-pre-wrap break-words text-[17px] leading-[1.47] font-normal">
                      {message.content}
                    </p>
                  )}
                  <p
                    className={`text-[13px] mt-2.5 ${
                      message.role === 'user'
                        ? 'text-[#FFFFFF]/60'
                        : 'text-[#8E8E93]'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1C1C1E] border border-[#38383A]/30 rounded-2xl px-5 py-3.5">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-[#8E8E93] rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-[#8E8E93] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-2 h-2 bg-[#8E8E93] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Image Preview Section */}
      {selectedImages.length > 0 && (
        <div className="bg-[#1C1C1E] border-t border-[#38383A]/50 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <Paperclip className="w-5 h-5 text-[#8E8E93]" />
              <span className="text-[15px] text-[#FFFFFF] font-medium">
                {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-xl border border-[#38383A]/30"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 p-1 bg-[#FF3B30] text-[#FFFFFF] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assets List */}
      {assets.length > 0 && (
        <div className="bg-[#1C1C1E] border-t border-[#38383A]/50 px-6 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="text-[13px] text-[#8E8E93] mb-2 font-medium">Uploaded Assets:</div>
            <div className="flex flex-wrap gap-3">
              {assets.map((asset) => (
                <a
                  key={asset.id}
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-[#007AFF] hover:text-[#0051D5] font-medium transition-colors"
                >
                  {asset.originalName}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-[#1C1C1E] border-t border-[#38383A]/50 px-6 py-5 backdrop-blur-xl bg-opacity-80">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              multiple
              className="hidden"
              id="image-input"
            />
            <label
              htmlFor="image-input"
              className="p-3 hover:bg-[#2C2C2E] rounded-xl cursor-pointer transition-all duration-200 active:scale-95 flex-shrink-0"
              title="Upload images"
            >
              <Paperclip className="w-5 h-5 text-[#FFFFFF]" />
            </label>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              rows={1}
              className="flex-1 px-5 py-3.5 bg-[#2C2C2E] border border-[#38383A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[17px] text-[#FFFFFF] placeholder:text-[#8E8E93] font-normal transition-all duration-200 disabled:opacity-50 resize-none overflow-hidden min-h-[52px] max-h-[200px] leading-[1.47]"
              disabled={loading}
              style={{ height: 'auto' }}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && selectedImages.length === 0)}
              className="p-3.5 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

