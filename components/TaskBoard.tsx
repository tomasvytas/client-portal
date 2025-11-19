'use client'

import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, DollarSign, User, FileText, GripVertical, X, Paperclip, Link as LinkIcon } from 'lucide-react'

interface Task {
  id: string
  title: string | null
  status: string
  clientName: string | null
  clientEmail: string | null
  productName: string | null
  deadline: string | null
  estimatedPrice: number | null
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

const columns = [
  { id: 'draft', title: 'Draft', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'completed', title: 'Completed', color: 'bg-green-100' },
  { id: 'cancelled', title: 'Cancelled', color: 'bg-red-100' },
]

function SortableTask({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleClick = (e: React.MouseEvent) => {
    // Don't open if clicking the drag handle
    if ((e.target as HTMLElement).closest('.drag-handle')) return
    onOpen(task)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline'
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className="bg-white rounded-lg shadow p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2 mb-2">
        <div
          {...attributes}
          {...listeners}
          className="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <h4 className="font-semibold text-gray-900 flex-1">
          {task.productName || task.title || 'Untitled Task'}
        </h4>
      </div>

      {task.productName && task.title && task.title !== task.productName && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <FileText className="w-4 h-4" />
          <span className="truncate">{task.title}</span>
        </div>
      )}

      {task.clientName && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <User className="w-4 h-4" />
          <span>{task.clientName}</span>
        </div>
      )}

      {task.deadline && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(task.deadline)}</span>
        </div>
      )}

      {task.estimatedPrice && (
        <div className="flex items-center gap-2 text-sm font-medium text-blue-600 mb-2">
          <DollarSign className="w-4 h-4" />
          <span>{formatPrice(task.estimatedPrice)}</span>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-xs text-gray-500">
        <span>{task._count.messages} messages</span>
        <span>{task._count.assets} assets</span>
      </div>

      <div className="text-xs text-gray-400 mt-2">
        {task.user.name || task.user.email}
      </div>
    </div>
  )
}

interface TaskDetail extends Task {
  productDescription?: string | null
  finalPrice?: number | null
  messages?: Array<{
    id: string
    role: string
    content: string
    createdAt: string
  }>
  assets?: Array<{
    id: string
    originalName: string
    url: string
    mimeType: string
    size: number
    createdAt: string
  }>
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return

    // Check if dropped on another task (same column reorder)
    const overTask = tasks.find((t) => t.id === over.id)
    
    if (overTask && activeTask.status === overTask.status) {
      // Reorder within same column
      const columnTasks = getTasksByStatus(activeTask.status)
      const oldIndex = columnTasks.findIndex((t) => t.id === active.id)
      const newIndex = columnTasks.findIndex((t) => t.id === over.id)

      if (oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex)
        setTasks((prev) => {
          const otherTasks = prev.filter((t) => t.status !== activeTask.status)
          return [...otherTasks, ...reordered]
        })
      }
    } else {
      // Check if dropped on a column
      const column = columns.find((c) => c.id === over.id)
      if (column && activeTask.status !== column.id) {
        const newStatus = column.id

        // Optimistically update UI
        setTasks((prev) =>
          prev.map((task) =>
            task.id === active.id ? { ...task, status: newStatus } : task
          )
        )

        // Update in backend
        try {
          await fetch(`/api/admin/tasks/${active.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
        } catch (error) {
          console.error('Error updating task:', error)
          // Revert on error
          fetchTasks()
        }
      }
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  const handleOpenTask = async (task: Task) => {
    setLoadingDetails(true)
    try {
      // Fetch full task details including messages
      const res = await fetch(`/api/admin/tasks/${task.id}/details`)
      if (res.ok) {
        const data = await res.json()
        setSelectedTask(data.task)
      } else {
        // Fallback to basic task info
        setSelectedTask(task as TaskDetail)
      }
    } catch (error) {
      console.error('Error fetching task details:', error)
      setSelectedTask(task as TaskDetail)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedTask(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading tasks...</div>
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id)
            return <Column key={column.id} column={column} tasks={columnTasks} onOpen={handleOpenTask} />
          })}
        </div>
      </DndContext>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={handleCloseModal} loading={loadingDetails} />
      )}
    </>
  )
}

function Column({ column, tasks, onOpen }: { column: typeof columns[0]; tasks: Task[]; onOpen: (task: Task) => void }) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  return (
    <div className="flex flex-col">
      <div className={`${column.color} rounded-t-lg px-4 py-2`}>
        <h3 className="font-semibold text-gray-900">{column.title}</h3>
        <p className="text-sm text-gray-600">{tasks.length} tasks</p>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 bg-gray-100 rounded-b-lg p-3 min-h-[500px]"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function TaskDetailModal({ task, onClose, loading }: { task: TaskDetail; onClose: () => void; loading: boolean }) {
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
      currency: 'USD',
    }).format(price)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Extract URLs from all messages
  const extractLinks = (): string[] => {
    if (!task.messages || task.messages.length === 0) return []
    
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const links = new Set<string>()
    
    task.messages.forEach(message => {
      const matches = message.content.match(urlRegex)
      if (matches) {
        matches.forEach(url => links.add(url))
      }
    })
    
    return Array.from(links)
  }

  const links = extractLinks()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {task.title || 'Untitled Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading task details...</div>
          ) : (
            <div className="space-y-6">
              {/* Task Summary Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Task Summary
                </h3>
                <div className="space-y-4">
                  {/* Task Title */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Task</label>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {task.title || 'Untitled Task'}
                    </p>
                  </div>

                  {/* What Needs to be Done */}
                  {task.productName && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Product/Service</label>
                      <p className="text-lg text-gray-900 mt-1 font-medium">{task.productName}</p>
                    </div>
                  )}

                  {task.productDescription && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">What Needs to be Done</label>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap leading-relaxed">{task.productDescription}</p>
                    </div>
                  )}

                  {/* Key Details Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200">
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Deadline</label>
                      <p className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {formatDate(task.deadline)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Budget</label>
                      <div className="mt-1">
                        {task.finalPrice ? (
                          <p className="text-base font-semibold text-green-600 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Final: {formatPrice(task.finalPrice)}
                          </p>
                        ) : task.estimatedPrice ? (
                          <p className="text-base font-semibold text-blue-600 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Estimated: {formatPrice(task.estimatedPrice)}
                          </p>
                        ) : (
                          <p className="text-base text-gray-500">Not set</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Client</label>
                      <p className="text-base text-gray-900 mt-1 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        {task.clientName || task.user.name || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status</label>
                      <p className="text-base font-semibold text-gray-900 mt-1 capitalize">
                        {task.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  {/* Links Summary */}
                  {links.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Links</label>
                      <div className="mt-2 space-y-1">
                        {links.map((link, index) => (
                          <a
                            key={index}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                          >
                            <LinkIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets Summary */}
                  {task.assets && task.assets.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Assets</label>
                      <p className="text-base text-gray-900 mt-1">
                        {task.assets.length} file{task.assets.length !== 1 ? 's' : ''} uploaded
                      </p>
                    </div>
                  )}

                  {/* Messages Summary */}
                  {task.messages && task.messages.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Conversation</label>
                      <p className="text-base text-gray-900 mt-1">
                        {task.messages.length} message{task.messages.length !== 1 ? 's' : ''} exchanged
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Sections */}
              <div className="space-y-6">
                {/* Client Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Client Name</label>
                    <p className="text-base text-gray-900">{task.clientName || task.user.name || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-base text-gray-900">{task.clientEmail || task.user.email || 'Not set'}</p>
                  </div>
                </div>

                {/* Messages */}
                {task.messages && task.messages.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      Conversation ({task.messages.length} messages)
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
                      {task.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-100 text-blue-900 ml-4'
                              : 'bg-white text-gray-900 mr-4'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-medium">
                              {message.role === 'user' ? 'Client' : 'AI Assistant'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assets */}
                {task.assets && task.assets.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      Uploaded Assets ({task.assets.length})
                    </label>
                    <div className="space-y-2">
                      {task.assets.map((asset) => (
                        <a
                          key={asset.id}
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Paperclip className="w-5 h-5 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{asset.originalName}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(asset.size)} • {formatDate(asset.createdAt)}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Created:</span>{' '}
                      <span className="text-gray-900">{formatDate(task.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Updated:</span>{' '}
                      <span className="text-gray-900">{formatDate(task.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

