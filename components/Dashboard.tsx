'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { Package, Plus, X, Building2 } from 'lucide-react'
import PortalSelector from './PortalSelector'

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
  organizationId: string | null
  messages: Array<{ id: string }>
  assets: Array<{ id: string; originalName: string }>
}

interface Provider {
  id: string
  name: string
  slug: string
  owner: {
    name: string | null
    email: string | null
  }
  joinedAt: string
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [addingProvider, setAddingProvider] = useState(false)

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
    fetchProviders()
    fetchTasks()
  }, [])

  useEffect(() => {
    // When providers load, select the first one
    if (providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(providers[0].id)
    }
  }, [providers])

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/client/providers')
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers || [])
      }
    } catch (error) {
      console.error('Error fetching providers:', error)
    }
  }

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

  const handleAddProvider = async () => {
    if (!inviteCode.trim()) {
      alert('Please enter an invite code')
      return
    }

    setAddingProvider(true)
    try {
      const res = await fetch('/api/client/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        await fetchProviders()
        setInviteCode('')
        setShowAddProvider(false)
        // Select the newly added provider
        if (data.provider) {
          setSelectedProviderId(data.provider.id)
        }
      } else {
        alert(data.error || 'Failed to add provider')
      }
    } catch (error) {
      console.error('Error adding provider:', error)
      alert('Failed to add provider')
    } finally {
      setAddingProvider(false)
    }
  }

  const createNewTask = async () => {
    if (!selectedProviderId) {
      alert('Please select a service provider')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: 'New Task Chat',
          organizationId: selectedProviderId,
        }),
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

  // Filter tasks by selected provider
  const filteredTasks = selectedProviderId
    ? tasks.filter(task => task.organizationId === selectedProviderId)
    : tasks

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image
                src="/Logo.svg"
                alt="Task Chat"
                width={120}
                height={40}
                className="object-contain w-24 sm:w-[120px]"
                priority
              />
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <PortalSelector />
              <button
                onClick={() => signOut()}
                className="text-[13px] sm:text-[15px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Provider Tabs */}
        {providers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProviderId(provider.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] sm:text-[15px] font-semibold transition-all whitespace-nowrap ${
                    selectedProviderId === provider.id
                      ? 'bg-[#007AFF] text-[#FFFFFF]'
                      : 'bg-[#2C2C2E] text-[#8E8E93] hover:bg-[#38383A] hover:text-[#FFFFFF]'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  {provider.name}
                </button>
              ))}
              <button
                onClick={() => setShowAddProvider(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2E] text-[#007AFF] rounded-xl text-[14px] sm:text-[15px] font-semibold hover:bg-[#38383A] transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Provider
              </button>
            </div>
          </div>
        )}

        {/* Add Provider Modal */}
        {showAddProvider && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddProvider(false)}>
            <div className="bg-[#1C1C1E] rounded-2xl p-6 max-w-md w-full border border-[#38383A]/50" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[20px] font-semibold text-[#FFFFFF]">Add Service Provider</h3>
                <button
                  onClick={() => setShowAddProvider(false)}
                  className="p-2 hover:bg-[#2C2C2E] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#8E8E93]" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code"
                    className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddProvider()
                      }
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddProvider(false)}
                    className="flex-1 px-4 py-3 bg-[#2C2C2E] text-[#FFFFFF] rounded-xl hover:bg-[#38383A] transition-colors text-[15px] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProvider}
                    disabled={addingProvider || !inviteCode.trim()}
                    className="flex-1 px-4 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[15px] font-semibold"
                  >
                    {addingProvider ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-[#FFFFFF] tracking-tight">
            {selectedProviderId ? providers.find(p => p.id === selectedProviderId)?.name + ' Tasks' : 'Your Tasks'}
          </h2>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => router.push('/products')}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#2C2C2E] text-[#FFFFFF] text-[14px] sm:text-[15px] font-semibold rounded-xl hover:bg-[#38383A] transition-all duration-200 active:scale-95 flex-1 sm:flex-initial"
            >
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Products</span>
            </button>
            <button
              onClick={createNewTask}
              disabled={creating || !selectedProviderId}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#007AFF] text-[#FFFFFF] text-[14px] sm:text-[15px] font-semibold rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 flex-1 sm:flex-initial"
            >
              {creating ? 'Creating...' : <><span className="hidden sm:inline">+ New Task Chat</span><span className="sm:hidden">+ New</span></>}
            </button>
          </div>
        </div>

        {providers.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-16 text-center border border-[#38383A]/30">
            <p className="text-[#8E8E93] text-[17px] mb-6">You're not linked to any service providers yet.</p>
            <button
              onClick={() => setShowAddProvider(true)}
              className="px-6 py-3 bg-[#007AFF] text-[#FFFFFF] text-[15px] font-semibold rounded-xl hover:bg-[#0051D5] transition-all duration-200 active:scale-95"
            >
              Add Your First Provider
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-[#1C1C1E] rounded-2xl p-16 text-center border border-[#38383A]/30">
            <p className="text-[#8E8E93] text-[17px] mb-6">You don't have any tasks for this provider yet.</p>
            <button
              onClick={createNewTask}
              disabled={creating || !selectedProviderId}
              className="px-6 py-3 bg-[#007AFF] text-[#FFFFFF] text-[15px] font-semibold rounded-xl hover:bg-[#0051D5] disabled:opacity-50 transition-all duration-200 active:scale-95"
            >
              Create Your First Task
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className="bg-[#1C1C1E] rounded-2xl p-4 sm:p-6 cursor-pointer hover:bg-[#2C2C2E] border border-[#38383A]/30 transition-all duration-200 active:scale-[0.98]"
                style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)' }}
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <h3 className="text-[15px] sm:text-[17px] font-semibold text-[#FFFFFF] leading-tight flex-1 min-w-0">
                    {task.productName || task.title || 'Untitled Task'}
                  </h3>
                  <span
                    className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold rounded-lg uppercase tracking-wide flex-shrink-0 ${
                      task.status === 'completed' || task.status === 'done'
                        ? 'bg-[#30D158]/20 text-[#30D158]'
                        : task.status === 'in_progress' || task.status === 'started'
                        ? 'bg-[#007AFF]/20 text-[#007AFF]'
                        : task.status === 'cancelled' || task.status === 'archive'
                        ? 'bg-[#FF3B30]/20 text-[#FF3B30]'
                        : 'bg-[#8E8E93]/20 text-[#8E8E93]'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                {task.productName && task.title && task.title !== task.productName && (
                  <p className="text-[14px] sm:text-[15px] text-[#8E8E93] mb-2 sm:mb-3">
                    {task.title}
                  </p>
                )}

                {task.clientName && (
                  <p className="text-[14px] sm:text-[15px] text-[#8E8E93] mb-2 sm:mb-3">
                    Client: {task.clientName}
                  </p>
                )}

                <div className="flex justify-between items-center mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-[#38383A]/30">
                  <div className="text-[12px] sm:text-[13px] text-[#8E8E93]">
                    {task.messages.length > 0
                      ? `${task.messages.length} message${task.messages.length !== 1 ? 's' : ''}`
                      : 'No messages yet'}
                  </div>
                  <div className="text-[12px] sm:text-[13px] text-[#8E8E93]">
                    {formatDate(task.updatedAt)}
                  </div>
                </div>

                {task.estimatedPrice && (
                  <div className="mt-2 sm:mt-3 text-[14px] sm:text-[15px] font-semibold text-[#30D158]">
                    {formatPrice(task.estimatedPrice)}
                  </div>
                )}

                {task.assets.length > 0 && (
                  <div className="mt-2 text-[12px] sm:text-[13px] text-[#8E8E93]">
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

