'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Calendar, Copy, CheckCircle, ExternalLink, Trash2, Loader2, Building, Globe, FileText, ChevronDown, ChevronUp, Package } from 'lucide-react'
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

interface ClientDetail extends Client {
  companyName: string | null
  products: Array<{
    id: string
    name: string
    websiteUrl: string | null
    productType: string | null
    brandGuidelines: string | null
    analysisData: any
    status: string
    createdAt: string
    updatedAt: string
  }>
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
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [clientDetails, setClientDetails] = useState<Record<string, ClientDetail>>({})
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null)

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
      } else {
        // Log error for debugging
        const errorData = await orgRes.json().catch(() => ({}))
        console.error('Error fetching organization:', errorData)
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
        // Remove from expanded state if it was expanded
        if (expandedClient === clientId) {
          setExpandedClient(null)
          setClientDetails(prev => {
            const newDetails = { ...prev }
            delete newDetails[clientId]
            return newDetails
          })
        }
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

  const handleToggleClientDetails = async (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null)
      return
    }

    setExpandedClient(clientId)
    setLoadingDetails(clientId)

    // If we already have the details, don't fetch again
    if (clientDetails[clientId]) {
      setLoadingDetails(null)
      return
    }

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/details`)
      if (res.ok) {
        const data = await res.json()
        setClientDetails(prev => ({
          ...prev,
          [clientId]: data.client,
        }))
      } else {
        const error = await res.json()
        console.error('Error fetching client details:', error)
      }
    } catch (error) {
      console.error('Error fetching client details:', error)
    } finally {
      setLoadingDetails(null)
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
      {organization ? (
        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
          <h2 className="text-[20px] font-semibold text-[#FFFFFF] mb-2">Your Organization</h2>
          <p className="text-[14px] text-[#8E8E93] mb-6">Manage your organization and invite clients</p>
          
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
      ) : (
        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
          <h2 className="text-[20px] font-semibold text-[#FFFFFF] mb-4">Organization & Invite</h2>
          <p className="text-[#8E8E93] text-[15px]">
            Organization not found. Please complete your subscription setup to generate an invite code.
          </p>
        </div>
      )}

      {/* Clients List */}
      <div className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/30 overflow-hidden">
        <div className="p-6 border-b border-[#38383A]/30">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-[20px] font-semibold text-[#FFFFFF]">Your Clients</h2>
              <p className="text-[14px] text-[#8E8E93] mt-1">Clients linked to your organization</p>
            </div>
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
                clients.map((client) => {
                  const isExpanded = expandedClient === client.id
                  const details = clientDetails[client.id]
                  const isLoading = loadingDetails === client.id

                  return (
                    <>
                      <tr key={client.id} className="hover:bg-[#2C2C2E]/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleClientDetails(client.id)}
                              className="p-1 hover:bg-[#38383A] rounded transition-colors"
                              title={isExpanded ? 'Hide details' : 'Show company & products'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#8E8E93]" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#8E8E93]" />
                              )}
                            </button>
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
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 bg-[#2C2C2E]/30">
                            {isLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-[#007AFF] animate-spin" />
                                <span className="ml-3 text-[#8E8E93]">Loading client details...</span>
                              </div>
                            ) : details ? (
                              <div className="space-y-6">
                                {/* Company Information */}
                                <div className="bg-[#1C1C1E] rounded-xl p-4 border border-[#38383A]/30">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Building className="w-5 h-5 text-[#007AFF]" />
                                    <h3 className="text-[17px] font-semibold text-[#FFFFFF]">Company Information</h3>
                                  </div>
                                  {details.companyName ? (
                                    <p className="text-[15px] text-[#FFFFFF]">{details.companyName}</p>
                                  ) : (
                                    <p className="text-[14px] text-[#8E8E93]">No company registered</p>
                                  )}
                                </div>

                                {/* Products Analysis */}
                                <div className="bg-[#1C1C1E] rounded-xl p-4 border border-[#38383A]/30">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Package className="w-5 h-5 text-[#30D158]" />
                                    <h3 className="text-[17px] font-semibold text-[#FFFFFF]">
                                      Product Analysis ({details.products?.length || 0})
                                    </h3>
                                  </div>
                                  {details.products && details.products.length > 0 ? (
                                    <div className="space-y-4">
                                      {details.products.map((product) => (
                                        <div key={product.id} className="bg-[#2C2C2E] rounded-lg p-4 border border-[#38383A]/30">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-[16px] font-semibold text-[#FFFFFF]">{product.name}</h4>
                                                {product.productType && (
                                                  <span className="px-2 py-0.5 bg-[#007AFF]/20 text-[#007AFF] text-[11px] font-semibold rounded">
                                                    {product.productType}
                                                  </span>
                                                )}
                                                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                                                  product.status === 'completed' 
                                                    ? 'bg-[#30D158]/20 text-[#30D158]'
                                                    : product.status === 'analyzing'
                                                    ? 'bg-[#007AFF]/20 text-[#007AFF]'
                                                    : 'bg-[#8E8E93]/20 text-[#8E8E93]'
                                                }`}>
                                                  {product.status}
                                                </span>
                                              </div>
                                              {product.websiteUrl && (
                                                <div className="flex items-center gap-1.5 text-[13px] text-[#8E8E93] mb-2">
                                                  <Globe className="w-3.5 h-3.5" />
                                                  <a
                                                    href={product.websiteUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:text-[#007AFF] transition-colors"
                                                  >
                                                    {product.websiteUrl}
                                                  </a>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          {product.brandGuidelines && product.status === 'completed' && (
                                            <div className="mt-3 pt-3 border-t border-[#38383A]/30">
                                              <div className="flex items-center gap-2 mb-2">
                                                <FileText className="w-4 h-4 text-[#8E8E93]" />
                                                <span className="text-[13px] font-semibold text-[#8E8E93] uppercase">Brand Guidelines</span>
                                              </div>
                                              <div className="text-[14px] text-[#FFFFFF] line-clamp-3">
                                                {product.brandGuidelines.substring(0, 300)}
                                                {product.brandGuidelines.length > 300 && '...'}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[14px] text-[#8E8E93]">No products analyzed yet</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-[#8E8E93]">
                                Failed to load client details
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

