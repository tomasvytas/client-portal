'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { Package, Plus, X, Building2, FileText, DollarSign, TrendingUp, Globe, Building, Settings, Sparkles } from 'lucide-react'
import PortalSelector from './PortalSelector'
import ClientSettings from './ClientSettings'

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
  const [stats, setStats] = useState<{ totalTasks: number; totalSpending: number; companyName: string | null } | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [products, setProducts] = useState<Array<{ id: string; name: string | null; websiteUrl: string | null; status: string; productType: string | null; createdAt: string }>>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)
  const [showProductWebsiteModal, setShowProductWebsiteModal] = useState(false)
  const [productWebsite, setProductWebsite] = useState('')
  const [productName, setProductName] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [activeTab, setActiveTab] = useState<'tasks' | 'settings' | 'statistics'>('tasks')

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
    fetchStats()
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoadingProducts(true)
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    // Set company name from stats when loaded
    if (stats?.companyName && !companyName) {
      setCompanyName(stats.companyName)
    }
  }, [stats])

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

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/client/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleSaveCompany = async () => {
    if (!companyName.trim()) {
      alert('Please enter a company name')
      return
    }

    setSavingCompany(true)
    try {
      const res = await fetch('/api/client/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() }),
      })

      if (res.ok) {
        setStats(prev => prev ? { ...prev, companyName: companyName.trim() } : null)
        setShowCompanyModal(false)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save company name')
      }
    } catch (error) {
      console.error('Error saving company:', error)
      alert('Failed to save company name')
    } finally {
      setSavingCompany(false)
    }
  }

  const handleAddProductWebsite = async () => {
    if (!productWebsite.trim() || !productName.trim()) {
      alert('Please enter both product name and website URL')
      return
    }

    // Validate URL format
    try {
      new URL(productWebsite.startsWith('http') ? productWebsite : `https://${productWebsite}`)
    } catch {
      alert('Please enter a valid website URL (e.g., https://www.example.com)')
      return
    }

    setAddingProduct(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName.trim(),
          websiteUrl: productWebsite.startsWith('http') ? productWebsite : `https://${productWebsite}`,
          organizationId: selectedProviderId || null, // Link product to selected provider
        }),
      })

      if (res.ok) {
        setProductWebsite('')
        setProductName('')
        setShowProductWebsiteModal(false)
        // Refresh products list
        await fetchProducts()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to add product')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Failed to add product')
    } finally {
      setAddingProduct(false)
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
              <a href="/" className="cursor-pointer">
                <Image
                  src="/Logo.svg"
                  alt="Task Chat"
                  width={120}
                  height={40}
                  className="object-contain w-24 sm:w-[120px]"
                  priority
                />
              </a>
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
        {/* Tabs */}
        <div className="mb-6 border-b border-[#38383A]/50">
          <nav className="flex space-x-4 sm:space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`${
                activeTab === 'tasks'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2 sm:gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[14px] sm:text-[15px] transition-colors`}
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`${
                activeTab === 'statistics'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2 sm:gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[14px] sm:text-[15px] transition-colors`}
            >
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${
                activeTab === 'settings'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2 sm:gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[14px] sm:text-[15px] transition-colors`}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              Settings
            </button>
          </nav>
        </div>

        {activeTab === 'settings' ? (
          <ClientSettings />
        ) : activeTab === 'statistics' ? (
          <div>
            {/* Statistics Cards */}
            {!loadingStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
                <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-[#007AFF]" />
                  </div>
                  <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
                    {stats?.totalTasks || 0}
                  </div>
                  <div className="text-[15px] text-[#8E8E93]">Total Tasks</div>
                </div>
                <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-[#30D158]" />
                  </div>
                  <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
                    {formatPrice(stats?.totalSpending || 0)}
                  </div>
                  <div className="text-[15px] text-[#8E8E93]">Total Spending</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>

            {/* Onboarding Prompts */}
            {!loadingStats && (
              <>
                {/* Company Registration Prompt */}
                {!stats?.companyName && (
                  <div className="mb-6 bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 rounded-2xl p-6 border border-[#007AFF]/20">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-[#007AFF]/20 rounded-xl">
                        <Building2 className="w-6 h-6 text-[#007AFF]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-[18px] font-semibold text-[#FFFFFF] mb-2">Register Your Company</h3>
                        <p className="text-[14px] text-[#8E8E93] mb-4">
                          Complete your profile by registering your company name. This helps service providers understand your business better.
                        </p>
                        <button
                          onClick={() => setShowCompanyModal(true)}
                          className="px-6 py-2.5 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors text-[15px] font-semibold"
                        >
                          Register Company
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Products Section */}
                {providers.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[20px] font-semibold text-[#FFFFFF]">Products</h3>
                      <button
                        onClick={() => setShowProductWebsiteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#30D158] text-[#FFFFFF] rounded-xl hover:bg-[#28A745] transition-colors text-[14px] font-semibold"
                      >
                        <Plus className="w-4 h-4" />
                        Add Product
                      </button>
                    </div>
                    
                    {loadingProducts ? (
                      <div className="bg-[#1C1C1E] rounded-2xl p-8 text-center border border-[#38383A]/30">
                        <div className="text-[#8E8E93] text-[15px]">Loading products...</div>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="bg-gradient-to-r from-[#30D158]/10 to-[#34C759]/10 rounded-2xl p-6 border border-[#30D158]/20">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-[#30D158]/20 rounded-xl">
                            <Sparkles className="w-6 h-6 text-[#30D158]" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-[18px] font-semibold text-[#FFFFFF] mb-2">Add Your Product for Analysis</h3>
                            <p className="text-[14px] text-[#8E8E93] mb-4">
                              Add your product website to get AI-powered analysis. This helps service providers understand your brand and create better briefs.
                            </p>
                            <button
                              onClick={() => setShowProductWebsiteModal(true)}
                              className="px-6 py-2.5 bg-[#30D158] text-[#FFFFFF] rounded-xl hover:bg-[#28A745] transition-colors text-[15px] font-semibold"
                            >
                              Add Product
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => router.push('/products')}
                            className="bg-[#1C1C1E] rounded-2xl p-5 border border-[#38383A]/30 hover:bg-[#2C2C2E] cursor-pointer transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[16px] font-semibold text-[#FFFFFF] truncate mb-1">
                                  {product.name || 'Unnamed Product'}
                                </h4>
                                {product.websiteUrl && (
                                  <p className="text-[13px] text-[#8E8E93] truncate">
                                    {product.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                  </p>
                                )}
                              </div>
                              <span className={`px-2 py-1 text-[11px] font-semibold rounded flex-shrink-0 ${
                                product.status === 'completed'
                                  ? 'bg-[#30D158]/20 text-[#30D158]'
                                  : product.status === 'analyzing' || product.status === 'pending'
                                  ? 'bg-[#007AFF]/20 text-[#007AFF]'
                                  : 'bg-[#FF3B30]/20 text-[#FF3B30]'
                              }`}>
                                {product.status}
                              </span>
                            </div>
                            {product.productType && (
                              <div className="mt-3 pt-3 border-t border-[#38383A]/30">
                                <span className="text-[12px] text-[#8E8E93]">Type: </span>
                                <span className="text-[12px] text-[#FFFFFF] font-medium">{product.productType}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

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

            {/* Company Registration Modal */}
        {showCompanyModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCompanyModal(false)}>
            <div className="bg-[#1C1C1E] rounded-2xl p-6 max-w-md w-full border border-[#38383A]/50" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[20px] font-semibold text-[#FFFFFF]">Register Your Company</h3>
                <button
                  onClick={() => setShowCompanyModal(false)}
                  className="p-2 hover:bg-[#2C2C2E] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#8E8E93]" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter your company name"
                    className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveCompany()
                      }
                    }}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCompanyModal(false)}
                    className="flex-1 px-4 py-3 bg-[#2C2C2E] text-[#FFFFFF] rounded-xl hover:bg-[#38383A] transition-colors text-[15px] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCompany}
                    disabled={savingCompany || !companyName.trim()}
                    className="flex-1 px-4 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[15px] font-semibold"
                  >
                    {savingCompany ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Website Modal */}
        {showProductWebsiteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowProductWebsiteModal(false)}>
            <div className="bg-[#1C1C1E] rounded-2xl p-6 max-w-md w-full border border-[#38383A]/50" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[20px] font-semibold text-[#FFFFFF]">Add Product for Analysis</h3>
                <button
                  onClick={() => setShowProductWebsiteModal(false)}
                  className="p-2 hover:bg-[#2C2C2E] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[#8E8E93]" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter product name"
                    className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={productWebsite}
                    onChange={(e) => setProductWebsite(e.target.value)}
                    placeholder="https://www.example.com"
                    className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
                  />
                  <p className="text-[13px] text-[#8E8E93] mt-2">Enter your product website URL to start analysis</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProductWebsiteModal(false)}
                    className="flex-1 px-4 py-3 bg-[#2C2C2E] text-[#FFFFFF] rounded-xl hover:bg-[#38383A] transition-colors text-[15px] font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProductWebsite}
                    disabled={addingProduct || !productWebsite.trim() || !productName.trim()}
                    className="flex-1 px-4 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[15px] font-semibold"
                  >
                    {addingProduct ? 'Adding...' : 'Add Product'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  )
}

