'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

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
      currency: 'USD',
    }).format(price)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">Client Portal</h1>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Tasks</h2>
          <button
            onClick={createNewTask}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? 'Creating...' : '+ New Task Chat'}
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">You don't have any tasks yet.</p>
            <button
              onClick={createNewTask}
              disabled={creating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Create Your First Task
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {task.productName || task.title || 'Untitled Task'}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                </div>

                {task.productName && task.title && task.title !== task.productName && (
                  <p className="text-sm text-gray-600 mb-2">
                    {task.title}
                  </p>
                )}

                {task.clientName && (
                  <p className="text-sm text-gray-600 mb-2">
                    Client: {task.clientName}
                  </p>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {task.messages.length > 0
                      ? `${task.messages.length} messages`
                      : 'No messages yet'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(task.updatedAt)}
                  </div>
                </div>

                {task.estimatedPrice && (
                  <div className="mt-2 text-sm font-medium text-blue-600">
                    {formatPrice(task.estimatedPrice)}
                  </div>
                )}

                {task.assets.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
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

