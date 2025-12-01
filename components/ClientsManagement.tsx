'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Calendar, Copy, CheckCircle, ExternalLink, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface Client {
  id: string
  name: string | null
  email: string | null
  joinedAt: string
  _count: {
    tasks: number
  }
}

interface Organization {
  id: string
  name: string
  inviteCode: string
  inviteLink: string
  subscription: {
    plan: string
    status: string
    clientCount: number
    currentPeriodEnd: string
  } | null
}

export default function ClientsManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [clientsRes, orgRes] = await Promise.all([
        fetch('/api/admin/clients'),
        fetch('/api/admin/organization'),
      ])

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        setClients(clientsData.clients || [])
      }

      if (orgRes.ok) {
        const orgData = await orgRes.json()
        setOrganization(orgData.organization || null)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyInvite = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text)
    setCopied(`${type}-${text}`)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleRemoveClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to remove this client? They will lose access to your services.')) {
      return
    }

    setDeleting(clientId)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchData() // Refresh
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to remove client')
      }
    } catch (error) {
      console.error('Error removing client:', error)
      alert('Failed to remove client')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Organization Info & Invite Section */}
      {organization && (
        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
          <h2 className="text-[20px] font-semibold text-[#FFFFFF] mb-6">Organization & Invite</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                Organization Name
              </label>
              <p className="text-[15px] text-[#FFFFFF]">{organization.name}</p>
            </div>
            {organization.subscription && (
              <div>
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                  Subscription
                </label>
                <p className="text-[15px] text-[#FFFFFF]">
                  {formatPlan(organization.subscription.plan)} - {organization.subscription.status}
                </p>
                <p className="text-[13px] text-[#8E8E93] mt-1">
                  Expires: {format(new Date(organization.subscription.currentPeriodEnd), 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-[#38383A]/30 space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                Invite Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={organization.inviteCode}
                  className="flex-1 px-4 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[15px] font-mono"
                />
                <button
                  onClick={() => handleCopyInvite(organization.inviteCode, 'code')}
                  className="px-4 py-2 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors flex items-center gap-2 text-[14px] font-semibold"
                >
                  {copied === `code-${organization.inviteCode}` ? (
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

            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={organization.inviteLink}
                  className="flex-1 px-4 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[13px] font-mono truncate"
                />
                <button
                  onClick={() => handleCopyInvite(organization.inviteLink, 'link')}
                  className="px-4 py-2 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors flex items-center gap-2 text-[14px] font-semibold"
                >
                  {copied === `link-${organization.inviteLink}` ? (
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
                <a
                  href={organization.inviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-[#2C2C2E] text-[#007AFF] rounded-xl hover:bg-[#38383A] transition-colors"
                  title="Open invite link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients List */}
      <div className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/30 overflow-hidden">
        <div className="p-6 border-b border-[#38383A]/30">
          <div className="flex justify-between items-center">
            <h2 className="text-[20px] font-semibold text-[#FFFFFF]">Clients</h2>
            <div className="text-[15px] text-[#8E8E93]">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#2C2C2E]">
              <tr>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Client</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Tasks</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF]">Joined</th>
                <th className="px-6 py-4 text-[15px] font-semibold text-[#FFFFFF] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#38383A]/30">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#8E8E93] text-[15px]">
                    No clients yet. Share your invite code or link to get started.
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-[#2C2C2E]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#007AFF]/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-[#007AFF]" />
                        </div>
                        <div>
                          <div className="text-[15px] font-semibold text-[#FFFFFF]">
                            {client.name || 'Unnamed Client'}
                          </div>
                          {client.email && (
                            <div className="text-[13px] text-[#8E8E93] flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3.5 h-3.5" />
                              {client.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] text-[#FFFFFF]">
                        {client._count.tasks} task{client._count.tasks !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[15px] text-[#8E8E93] flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(client.joinedAt), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveClient(client.id)}
                        disabled={deleting === client.id}
                        className="p-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove client"
                      >
                        {deleting === client.id ? (
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
    </div>
  )
}

