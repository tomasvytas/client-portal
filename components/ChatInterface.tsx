'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Paperclip, Send, X } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    try {
      const res = await fetch(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage }),
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await fetch(`/api/tasks/${taskId}/assets`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (data.asset) {
        setAssets((prev) => [data.asset, ...prev])
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        alert('File uploaded successfully!')
      } else {
        alert('Failed to upload file')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
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
                  currency: 'USD',
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
                  <p className="whitespace-pre-wrap break-words text-[17px] leading-[1.47] font-normal">
                    {message.content}
                  </p>
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

      {/* File Upload Section */}
      {selectedFile && (
        <div className="bg-[#1C1C1E] border-t border-[#38383A]/50 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Paperclip className="w-5 h-5 text-[#8E8E93]" />
              <span className="text-[15px] text-[#FFFFFF] font-medium">{selectedFile.name}</span>
              <span className="text-[13px] text-[#8E8E93]">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="p-2 hover:bg-[#2C2C2E] rounded-xl transition-all duration-200"
              >
                <X className="w-4 h-4 text-[#8E8E93]" />
              </button>
              <button
                onClick={handleFileUpload}
                disabled={uploading}
                className="px-5 py-2.5 bg-[#007AFF] text-[#FFFFFF] text-[15px] font-semibold rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
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
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="p-3 hover:bg-[#2C2C2E] rounded-xl cursor-pointer transition-all duration-200 active:scale-95 flex-shrink-0"
            >
              <Paperclip className="w-5 h-5 text-[#FFFFFF]" />
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-5 py-3.5 bg-[#2C2C2E] border border-[#38383A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[17px] text-[#FFFFFF] placeholder:text-[#8E8E93] font-normal transition-all duration-200 disabled:opacity-50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
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

