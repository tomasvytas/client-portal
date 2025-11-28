'use client'

import { useState, useEffect } from 'react'
import { Calendar, DollarSign, User, FileText, Edit2, CheckCircle, Archive, Play } from 'lucide-react'

interface Task {
  id: string
  title: string | null
  status: string
  clientName: string | null
  clientEmail: string | null
  productName: string | null
  productDescription: string | null
  deadline: string | null
  estimatedPrice: number | null
  finalPrice: number | null
  createdAt: string
  updatedAt: string
  user: {
    name: string | null
    email: string | null
  }
  _count: {
    messages: number
    assets: number
  }
}

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'bg-[#8E8E93]/20 text-[#8E8E93]' },
  { value: 'started', label: 'Started', color: 'bg-[#007AFF]/20 text-[#007AFF]' },
  { value: 'in_progress', label: 'Started', color: 'bg-[#007AFF]/20 text-[#007AFF]' }, // Map old value
  { value: 'done', label: 'Done', color: 'bg-[#34C759]/20 text-[#34C759]' },
  { value: 'completed', label: 'Done', color: 'bg-[#34C759]/20 text-[#34C759]' }, // Map old value
  { value: 'archive', label: 'Archive', color: 'bg-[#8E8E93]/20 text-[#8E8E93]' },
  { value: 'cancelled', label: 'Archive', color: 'bg-[#8E8E93]/20 text-[#8E8E93]' }, // Map old value
]

// Map old status values to new ones
const mapStatus = (status: string): string => {
  const mapping: Record<string, string> = {
    'in_progress': 'started',
    'completed': 'done',
    'cancelled': 'archive',
  }
  return mapping[status] || status
}

export default function TaskTable() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStatus, setEditingStatus] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/admin/tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        )
        setEditingStatus(null)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const getStatusBadge = (status: string) => {
    const mappedStatus = mapStatus(status)
    const statusOption = statusOptions.find((s) => s.value === mappedStatus || s.value === status) || statusOptions[0]
    return (
      <span className={`px-3 py-1 rounded-lg text-[13px] font-semibold ${statusOption.color}`}>
        {statusOption.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/30 overflow-hidden">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[800px]">
          <thead className="bg-[#2C2C2E]">
            <tr>
              <th className="px-4 sm:px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF]">Task</th>
              <th className="px-4 sm:px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF] hidden md:table-cell">Client</th>
              <th className="px-4 sm:px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF]">Deadline</th>
              <th className="px-4 sm:px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF]">Price</th>
              <th className="px-4 sm:px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF]">Status</th>
              <th className="px-4 sm:px-6 py-4 text-right text-[15px] font-semibold text-[#FFFFFF]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#38383A]/30">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#8E8E93] text-[15px]">
                  No tasks yet
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-[#2C2C2E]/50 transition-colors"
                >
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-[#8E8E93] mt-0.5 flex-shrink-0 hidden sm:block" />
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-[#FFFFFF] mb-1">
                          {task.productName || task.title || 'Untitled Task'}
                        </div>
                        {task.productDescription && (
                          <div className="text-[13px] text-[#8E8E93] line-clamp-2">
                            {task.productDescription.substring(0, 100)}
                            {task.productDescription.length > 100 ? '...' : ''}
                          </div>
                        )}
                        <div className="md:hidden mt-2 text-[13px] text-[#8E8E93]">
                          {task.clientName && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <User className="w-3.5 h-3.5" />
                              {task.clientName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#8E8E93]" />
                      <div>
                        <div className="text-[15px] text-[#FFFFFF]">
                          {task.clientName || '-'}
                        </div>
                        {task.clientEmail && (
                          <div className="text-[13px] text-[#8E8E93]">
                            {task.clientEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                      <span className="text-[15px] text-[#FFFFFF]">
                        {formatDate(task.deadline)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
                      <div>
                        {task.finalPrice ? (
                          <>
                            <div className="text-[15px] font-semibold text-[#34C759]">
                              {formatPrice(task.finalPrice)}
                            </div>
                            {task.estimatedPrice && task.estimatedPrice !== task.finalPrice && (
                              <div className="text-[13px] text-[#8E8E93] line-through">
                                {formatPrice(task.estimatedPrice)}
                              </div>
                            )}
                          </>
                        ) : task.estimatedPrice ? (
                          <div className="text-[15px] text-[#FFFFFF]">
                            {formatPrice(task.estimatedPrice)}
                          </div>
                        ) : (
                          <span className="text-[15px] text-[#8E8E93]">-</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    {editingStatus === task.id ? (
                      <select
                        value={mapStatus(task.status)}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        disabled={updating}
                        className="px-3 py-1.5 bg-[#2C2C2E] border border-[#38383A] rounded-lg text-[#FFFFFF] text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                        onBlur={() => setEditingStatus(null)}
                        autoFocus
                      >
                        {statusOptions.filter((opt, idx, self) => 
                          self.findIndex(o => o.value === opt.value) === idx && 
                          ['draft', 'started', 'done', 'archive'].includes(opt.value)
                        ).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingStatus(task.id)}
                        className="hover:opacity-80 transition-opacity"
                      >
                        {getStatusBadge(task.status)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => window.open(`/tasks/${task.id}`, '_blank')}
                        className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                        title="View task"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

