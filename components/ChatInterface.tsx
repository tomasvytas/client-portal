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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading chat...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {initialTask.productName || initialTask.title || 'Task Chat'}
              </h1>
              {initialTask.productName && initialTask.title && initialTask.title !== initialTask.productName && (
                <p className="text-sm text-gray-500">{initialTask.title}</p>
              )}
            </div>
          </div>
          {initialTask.estimatedPrice && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Estimated Price</div>
              <div className="text-lg font-semibold text-blue-600">
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
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">Start a conversation</p>
              <p className="text-sm text-gray-400">
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
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-blue-100'
                        : 'text-gray-500'
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
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* File Upload Section */}
      {selectedFile && (
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Paperclip className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-700">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={handleFileUpload}
                disabled={uploading}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assets List */}
      {assets.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2">
          <div className="max-w-4xl mx-auto">
            <div className="text-xs text-gray-500 mb-1">Uploaded Assets:</div>
            <div className="flex flex-wrap gap-2">
              {assets.map((asset) => (
                <a
                  key={asset.id}
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {asset.originalName}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

