'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'

interface Task {
  id: string
  title: string | null
  status: string
  clientName: string | null
  productName: string | null
  deadline: string | null
  estimatedPrice: number | null
  createdAt: string
  updatedAt: string
  messages: Array<{ id: string }>
  assets: Array<{ id: string; originalName: string }>
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminStatus()
  }, [session])

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/admin/check')
      if (res.ok) {
        const data = await res.json()
        setIsAdmin(data.isAdmin || false)
      }
    } catch (error) {
      // Not an admin or error
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewTask = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Task Chat' }),
      })
      const data = await res.json()
      if (data.task) {
        router.push(`/tasks/${data.task.id}`)
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatPrice = (price: number | null) => {
    if (!price) return 'Not set'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <nav className="bg-[#1C1C1E] border-b border-[#38383A]/50 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image
                src="/Logo.svg"
                alt="Task Chat"
                width={120}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex items-center gap-5">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="text-[15px] text-[#007AFF] hover:text-[#0051D5] font-medium transition-colors"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={() => signOut()}
                className="text-[15px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-[28px] font-bold text-[#FFFFFF] tracking-tight">Your Tasks</h2>
          <button
            onClick={createNewTask}
            disabled={creating}
            className="px-5 py-2.5 bg-[#007AFF] text-[#FFFFFF] text-[15px] font-semibold rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
          >
            {creating ? 'Creating...' : '+ New Task Chat'}
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-16 text-center border border-[#38383A]/30">
            <p className="text-[#8E8E93] text-[17px] mb-6">You don't have any tasks yet.</p>
            <button
              onClick={createNewTask}
              disabled={creating}
              className="px-6 py-3 bg-[#007AFF] text-[#FFFFFF] text-[15px] font-semibold rounded-xl hover:bg-[#0051D5] disabled:opacity-50 transition-all duration-200 active:scale-95"
            >
              Create Your First Task
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className="bg-[#1C1C1E] rounded-2xl p-6 cursor-pointer hover:bg-[#2C2C2E] border border-[#38383A]/30 transition-all duration-200 active:scale-[0.98]"
                style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-[17px] font-semibold text-[#FFFFFF] leading-tight flex-1 pr-2">
                    {task.productName || task.title || 'Untitled Task'}
                  </h3>
                  <span
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg uppercase tracking-wide ${
                      task.status === 'completed'
                        ? 'bg-[#30D158]/20 text-[#30D158]'
                        : task.status === 'in_progress'
                        ? 'bg-[#007AFF]/20 text-[#007AFF]'
                        : task.status === 'cancelled'
                        ? 'bg-[#FF3B30]/20 text-[#FF3B30]'
                        : 'bg-[#8E8E93]/20 text-[#8E8E93]'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                {task.productName && task.title && task.title !== task.productName && (
                  <p className="text-[15px] text-[#8E8E93] mb-3">
                    {task.title}
                  </p>
                )}

                {task.clientName && (
                  <p className="text-[15px] text-[#8E8E93] mb-3">
                    Client: {task.clientName}
                  </p>
                )}

                <div className="flex justify-between items-center mt-5 pt-4 border-t border-[#38383A]/30">
                  <div className="text-[13px] text-[#8E8E93]">
                    {task.messages.length > 0
                      ? `${task.messages.length} messages`
                      : 'No messages yet'}
                  </div>
                  <div className="text-[13px] text-[#8E8E93]">
                    {formatDate(task.updatedAt)}
                  </div>
                </div>

                {task.estimatedPrice && (
                  <div className="mt-3 text-[15px] font-semibold text-[#30D158]">
                    {formatPrice(task.estimatedPrice)}
                  </div>
                )}

                {task.assets.length > 0 && (
                  <div className="mt-2 text-[13px] text-[#8E8E93]">
                    {task.assets.length} asset{task.assets.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

