'use client'

import { useState, useEffect } from 'react'
import { Calendar, DollarSign, User, FileText, Edit2, CheckCircle, Archive, Play, X, ExternalLink, Trash2, MoreVertical, Loader2, Copy, Users } from 'lucide-react'

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

interface TaskDetail extends Task {
  googleDriveFolderLink?: string | null
  briefDocumentLink?: string | null
  messages?: Array<{
    id: string
    role: string
    content: string
    createdAt: string
  }>
  assets?: Array<{
    id: string
    filename: string
    originalName: string
    url: string
    mimeType: string
    size: number
  }>
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
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [organization, setOrganization] = useState<{ inviteCode: string; inviteLink: string; name: string; serviceId: string } | null>(null)
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)
  const [loadingOrganization, setLoadingOrganization] = useState(true)
  const [organizationError, setOrganizationError] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
    fetchOrganization()
  }, [])

  const fetchOrganization = async (retryCount = 0) => {
    setLoadingOrganization(true)
    setOrganizationError(null)
    try {
      const res = await fetch('/api/admin/organization', {
        cache: 'no-store',
      })
      const data = await res.json()
      
      if (res.ok && data.organization) {
        setOrganization({
          inviteCode: data.organization.inviteCode,
          inviteLink: data.organization.inviteLink,
          name: data.organization.name,
          serviceId: data.organization.serviceId,
        })
        setOrganizationError(null)
      } else if (res.status === 401) {
        setOrganizationError('Unauthorized - Please check your permissions')
      } else if (res.status === 404) {
        // User not found - shouldn't happen but handle gracefully
        setOrganizationError('User account not found. Please contact support.')
      } else if (data.error) {
        // If there's an error message, show it but also try to retry once
        if (retryCount < 1) {
          // Wait a bit and retry (organization might be getting created)
          setTimeout(() => {
            fetchOrganization(retryCount + 1)
          }, 2000)
          return
        }
        setOrganizationError(data.error || 'Failed to load organization information')
      } else if (!data.organization) {
        // No organization found - retry once in case it's being created
        if (retryCount < 1) {
          setTimeout(() => {
            fetchOrganization(retryCount + 1)
          }, 2000)
          return
        }
        setOrganizationError('No organization found. Please ensure you have completed your subscription setup.')
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
      // Retry once on network errors
      if (retryCount < 1) {
        setTimeout(() => {
          fetchOrganization(retryCount + 1)
        }, 2000)
        return
      }
      setOrganizationError('Failed to load organization information. Please refresh the page.')
    } finally {
      setLoadingOrganization(false)
    }
  }

  const handleCopyInvite = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text)
    setCopiedInvite(`${type}-${text}`)
    setTimeout(() => setCopiedInvite(null), 2000)
  }

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
        // Update selected task if it's open
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask({ ...selectedTask, status: newStatus })
        }
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

  const handleViewDetails = async (task: Task) => {
    setLoadingDetails(true)
    setSelectedTask(null)
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/details`)
      const data = await res.json()
      if (res.ok) {
        setSelectedTask(data.task)
      } else {
        alert(data.error || 'Failed to load task details')
      }
    } catch (error) {
      console.error('Error loading task details:', error)
      alert('Failed to load task details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    setDeleting(taskId)
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== taskId))
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(null)
        }
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete task')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    } finally {
      setDeleting(null)
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
    <div className="space-y-6">
      {/* Invite Code Badge - Always visible for service providers */}
      <div className="bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 rounded-2xl p-6 border border-[#007AFF]/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-[#007AFF]" />
                <h3 className="text-[18px] font-semibold text-[#FFFFFF]">Invite Clients</h3>
              </div>
              <p className="text-[14px] text-[#8E8E93] mb-3">
                Share your invite code or link with clients to join your organization
              </p>
              {loadingOrganization ? (
                <div className="text-[14px] text-[#8E8E93] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading invite information...
                </div>
              ) : organizationError ? (
                <div className="space-y-3">
                  <div className="text-[14px] text-[#FF3B30] bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl p-4">
                    {organizationError}
                  </div>
                  <button
                    onClick={() => fetchOrganization()}
                    className="px-4 py-2 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors text-[14px] font-semibold flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              ) : organization ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="px-4 py-3 bg-[#1C1C1E] border border-[#38383A] rounded-xl flex-1">
                        <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1">Invite Code</div>
                        <div className="text-[20px] font-bold text-[#007AFF] font-mono">{organization.inviteCode}</div>
                      </div>
                      <button
                        onClick={() => handleCopyInvite(organization.inviteCode, 'code')}
                        className="px-4 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors flex items-center gap-2 text-[14px] font-semibold"
                      >
                        {copiedInvite === `code-${organization.inviteCode}` ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={organization.inviteLink}
                        className="flex-1 px-4 py-3 bg-[#1C1C1E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[13px] font-mono truncate"
                      />
                      <button
                        onClick={() => handleCopyInvite(organization.inviteLink, 'link')}
                        className="px-4 py-3 bg-[#2C2C2E] text-[#007AFF] rounded-xl hover:bg-[#38383A] transition-colors flex items-center gap-2 text-[14px] font-semibold"
                      >
                        {copiedInvite === `link-${organization.inviteLink}` ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                      <a
                        href={organization.inviteLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-[#2C2C2E] text-[#007AFF] rounded-xl hover:bg-[#38383A] transition-colors"
                        title="Open invite link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[14px] text-[#8E8E93]">No organization found. Please contact support.</div>
              )}
            </div>
          </div>
        </div>

      <div className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/30 overflow-hidden">
        <div className="p-6 border-b border-[#38383A]/30">
          <h2 className="text-[20px] font-semibold text-[#FFFFFF]">Your Clients' Tasks</h2>
          <p className="text-[14px] text-[#8E8E93] mt-2">Manage tasks from your clients</p>
        </div>
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
                        onClick={() => handleViewDetails(task)}
                        className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                        title="View details"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        disabled={deleting === task.id}
                        className="p-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete task"
                      >
                        {deleting === task.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
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

      {/* Task Detail Modal */}
      {(selectedTask || loadingDetails) && (
        <TaskDetailModal
          task={selectedTask}
          loading={loadingDetails}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function TaskDetailModal({
  task,
  loading,
  onClose,
  onDelete,
}: {
  task: TaskDetail | null
  loading: boolean
  onClose: () => void
  onDelete: (taskId: string) => void
}) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatPrice = (price: number | null) => {
    if (!price) return 'Not set'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const getStatusColor = (status: string) => {
    const mappedStatus = mapStatus(status)
    switch (mappedStatus) {
      case 'done':
        return 'bg-[#34C759]/10 text-[#34C759]'
      case 'started':
        return 'bg-[#007AFF]/10 text-[#007AFF]'
      case 'archive':
        return 'bg-[#8E8E93]/10 text-[#8E8E93]'
      case 'draft':
      default:
        return 'bg-[#FF9500]/10 text-[#FF9500]'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#1C1C1E] rounded-2xl p-8 border border-[#38383A]/50">
          <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin mx-auto" />
          <p className="text-[#8E8E93] text-[15px] mt-4 text-center">Loading task details...</p>
        </div>
      </div>
    )
  }

  if (!task) return null

  return (
    <div
      className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#38383A]/30">
          <h2 className="text-[20px] sm:text-[24px] font-bold text-[#FFFFFF]">
            {task.productName || task.title || 'Untitled Task'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(task.id)}
              className="p-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#8E8E93] hover:bg-[#2C2C2E] rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            {/* Task Summary */}
            <div className="bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 rounded-2xl p-4 sm:p-6 border border-[#007AFF]/20">
              <h3 className="text-[17px] sm:text-[20px] font-semibold text-[#FFFFFF] mb-4 flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-[#007AFF]" />
                Task Summary
              </h3>
              <div className="space-y-4">
                {/* Product Name */}
                {task.productName && (
                  <div>
                    <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Product/Service</label>
                    <p className="text-[17px] text-[#FFFFFF] mt-1.5 font-semibold">{task.productName}</p>
                  </div>
                )}

                {/* Description */}
                {task.productDescription && (
                  <div>
                    <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Description</label>
                    <p className="text-[#FFFFFF] mt-1.5 whitespace-pre-wrap leading-relaxed text-[15px]">{task.productDescription}</p>
                  </div>
                )}

                {/* Key Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#007AFF]/30">
                  <div>
                    <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Deadline</label>
                    <p className="text-[15px] font-semibold text-[#FFFFFF] mt-1.5 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#8E8E93]" />
                      {formatDate(task.deadline)}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Budget</label>
                    <div className="mt-1.5">
                      {task.finalPrice ? (
                        <p className="text-[15px] font-semibold text-[#30D158] flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Final: {formatPrice(task.finalPrice)}
                        </p>
                      ) : task.estimatedPrice ? (
                        <p className="text-[15px] font-semibold text-[#007AFF] flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Estimated: {formatPrice(task.estimatedPrice)}
                        </p>
                      ) : (
                        <p className="text-[15px] text-[#8E8E93]">Not set</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Client</label>
                    <p className="text-[15px] text-[#FFFFFF] mt-1.5 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#8E8E93]" />
                      {task.user.name || task.clientName || 'Not set'}
                    </p>
                    {task.user.email || task.clientEmail ? (
                      <p className="text-[13px] text-[#8E8E93] mt-1 ml-6">
                        {task.user.email || task.clientEmail}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Status</label>
                    <p className="mt-1.5">
                      <span className={`px-3 py-1 rounded-lg text-[13px] font-semibold ${getStatusColor(task.status)}`}>
                        {mapStatus(task.status).charAt(0).toUpperCase() + mapStatus(task.status).slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Google Drive Links */}
                <div className="pt-3 border-t border-[#007AFF]/30 space-y-2">
                  {task.googleDriveFolderLink && (
                    <a
                      href={task.googleDriveFolderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#007AFF] hover:text-[#0051D5] text-[15px] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Google Drive Folder
                    </a>
                  )}
                  {task.briefDocumentLink && (
                    <a
                      href={task.briefDocumentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#007AFF] hover:text-[#0051D5] text-[15px] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Brief Document
                    </a>
                  )}
                  {!task.googleDriveFolderLink && !task.briefDocumentLink && (
                    <p className="text-[13px] text-[#8E8E93]">Google Drive links not available</p>
                  )}
                </div>

                {/* Stats */}
                <div className="pt-3 border-t border-[#007AFF]/30 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Messages</label>
                    <p className="text-[15px] text-[#FFFFFF] mt-1.5">{task._count?.messages || task.messages?.length || 0}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">Assets</label>
                    <p className="text-[15px] text-[#FFFFFF] mt-1.5">{task._count?.assets || task.assets?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Preview */}
            {task.messages && task.messages.length > 0 && (
              <div>
                <h3 className="text-[17px] font-semibold text-[#FFFFFF] mb-4">Recent Messages</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {task.messages.slice(-5).map((message) => (
                    <div
                      key={message.id}
                      className="bg-[#2C2C2E] rounded-xl p-4 border border-[#38383A]/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[11px] font-semibold uppercase ${
                          message.role === 'user' ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                        }`}>
                          {message.role === 'user' ? 'Client' : 'Assistant'}
                        </span>
                        <span className="text-[11px] text-[#8E8E93]">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-[15px] text-[#FFFFFF] whitespace-pre-wrap">
                        {message.content.substring(0, 200)}
                        {message.content.length > 200 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

