'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, CreditCard, FileText, TrendingUp, Calendar, DollarSign, ArrowLeft, Trash2, Loader2, LayoutGrid } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Stats {
  totalOrganizations: number
  totalClients: number
  totalTasks: number
  activeSubscriptions: number
  totalRevenue: number
}

interface Organization {
  id: string
  name: string
  owner: {
    name: string | null
    email: string | null
  }
  subscription: {
    plan: string
    status: string
    clientCount: number
    currentPeriodEnd: string
  } | null
  _count: {
    tasks: number
    clientProviders: number
  }
  createdAt: string
}

interface User {
  id: string
  name: string | null
  email: string | null
  role: string
  isMasterAdmin: boolean
  organization: {
    id: string
    name: string
  } | null
  _count: {
    tasks: number
    products: number
    clientProviders: number
  }
  createdAt: string
}

export default function MasterAdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'organizations' | 'users'>('organizations')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, orgsRes, usersRes] = await Promise.all([
        fetch('/api/master-admin/stats'),
        fetch('/api/master-admin/organizations'),
        fetch('/api/master-admin/users'),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
      }

      if (orgsRes.ok) {
        const orgsData = await orgsRes.json()
        setOrganizations(orgsData.organizations || [])
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string | null) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail || userId}? This action cannot be undone and will delete all associated data.`)) {
      return
    }

    setDeleting(userId)
    try {
      const res = await fetch(`/api/master-admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Refresh users list
        fetchData()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    } finally {
      setDeleting(null)
    }
  }

  const formatPlan = (plan: string) => {
    const plans: Record<string, string> = {
      '1_month': '1 Month',
      '3_month': '3 Months',
      '6_month': '6 Months',
    }
    return plans[plan] || plan
  }

  const calculateRevenue = (plan: string, clientCount: number) => {
    const basePrices: Record<string, number> = {
      '1_month': 50,
      '3_month': 35,
      '6_month': 25,
    }
    const clientFees: Record<string, number> = {
      '1_month': 10,
      '3_month': 8,
      '6_month': 7,
    }
    const basePrice = basePrices[plan] || 0
    const clientFee = clientFees[plan] || 0
    return basePrice + (clientCount * clientFee)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-[24px] font-bold text-[#FFFFFF]">Platform Admin Dashboard</h2>
        <p className="text-[15px] text-[#8E8E93] mt-2">Overview of all service providers using Task Chat</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-8 h-8 text-[#007AFF]" />
            <TrendingUp className="w-5 h-5 text-[#30D158]" />
          </div>
          <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
            {stats?.totalOrganizations || 0}
          </div>
          <div className="text-[15px] text-[#8E8E93]">Service Providers</div>
        </div>

        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-[#007AFF]" />
            <TrendingUp className="w-5 h-5 text-[#30D158]" />
          </div>
          <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
            {stats?.totalClients || 0}
          </div>
          <div className="text-[15px] text-[#8E8E93]">Total Clients</div>
        </div>

        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-[#007AFF]" />
            <TrendingUp className="w-5 h-5 text-[#30D158]" />
          </div>
          <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
            {stats?.totalTasks || 0}
          </div>
          <div className="text-[15px] text-[#8E8E93]">Total Tasks</div>
        </div>

        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="w-8 h-8 text-[#007AFF]" />
            <TrendingUp className="w-5 h-5 text-[#30D158]" />
          </div>
          <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
            {stats?.activeSubscriptions || 0}
          </div>
          <div className="text-[15px] text-[#8E8E93]">Active Subscriptions</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/30 overflow-hidden">
        <div className="border-b border-[#38383A]/30">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('organizations')}
              className={`flex-1 px-6 py-4 text-[15px] font-semibold transition-colors ${
                activeTab === 'organizations'
                  ? 'border-b-2 border-[#007AFF] text-[#007AFF]'
                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
              }`}
            >
              Organizations
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 text-[15px] font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'border-b-2 border-[#007AFF] text-[#007AFF]'
                  : 'text-[#8E8E93] hover:text-[#FFFFFF]'
              }`}
            >
              Users
            </button>
          </nav>
        </div>

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div>
            <div className="p-6 border-b border-[#38383A]/30">
              <h2 className="text-[20px] font-semibold text-[#FFFFFF]">All Service Providers</h2>
              <p className="text-[14px] text-[#8E8E93] mt-2">Platform-wide overview of all service providers using Task Chat</p>
            </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#2C2C2E]">
              <tr>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Organization</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Owner</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Subscription</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Clients</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Tasks</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Monthly Revenue</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#38383A]/30">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#8E8E93] text-[15px]">
                    No organizations yet
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-[#2C2C2E]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-[15px] font-semibold text-[#FFFFFF]">{org.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] text-[#FFFFFF]">{org.owner.name || 'N/A'}</div>
                      <div className="text-[13px] text-[#8E8E93]">{org.owner.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {org.subscription ? (
                        <div>
                          <div className="text-[15px] text-[#FFFFFF]">
                            {formatPlan(org.subscription.plan)}
                          </div>
                          <div className={`text-[13px] ${
                            org.subscription.status === 'active' ? 'text-[#30D158]' : 'text-[#8E8E93]'
                          }`}>
                            {org.subscription.status}
                          </div>
                          <div className="text-[13px] text-[#8E8E93] mt-1">
                            Expires: {format(new Date(org.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[15px] text-[#8E8E93]">No subscription</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] text-[#FFFFFF]">
                        {org._count.clientProviders}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] text-[#FFFFFF]">
                        {org._count.tasks}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {org.subscription ? (
                        <div className="text-[15px] font-semibold text-[#30D158]">
                          €{calculateRevenue(org.subscription.plan, org.subscription.clientCount)}
                        </div>
                      ) : (
                        <span className="text-[15px] text-[#8E8E93]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] text-[#8E8E93] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(org.createdAt), 'MMM d, yyyy')}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="p-6 border-b border-[#38383A]/30">
              <h2 className="text-[20px] font-semibold text-[#FFFFFF]">All Users</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#2C2C2E]">
                  <tr>
                    <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Name</th>
                    <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Email</th>
                    <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Role</th>
                    <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Organization</th>
                    <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Tasks</th>
                    <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Products</th>
                    <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Created</th>
                    <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#38383A]/30">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-[#8E8E93] text-[15px]">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-[#2C2C2E]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-[15px] font-semibold text-[#FFFFFF]">
                            {user.name || 'N/A'}
                            {user.isMasterAdmin && (
                              <span className="ml-2 px-2 py-0.5 bg-[#FF9500]/20 text-[#FF9500] text-[11px] font-semibold rounded">
                                MASTER
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[15px] text-[#FFFFFF]">{user.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[15px] text-[#FFFFFF] capitalize">
                            {user.role.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[15px] text-[#8E8E93]">
                            {user.organization?.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[15px] text-[#FFFFFF]">
                            {user._count.tasks}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[15px] text-[#FFFFFF]">
                            {user._count.products}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[15px] text-[#8E8E93] flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="p-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors"
                            title="Delete user"
                            disabled={deleting === user.id}
                          >
                            {deleting === user.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

