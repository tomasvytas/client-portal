'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Settings, LayoutGrid, DollarSign, CheckCircle, AlertCircle, Copy, Briefcase, Users, Shield, ExternalLink, FileText, CreditCard, Building2 } from 'lucide-react'
import PricingManagement from './PricingManagement'
import TaskTable from './TaskTable'
import ServicesManagement from './ServicesManagement'
import ClientsManagement from './ClientsManagement'
import MasterAdminDashboard from './MasterAdminDashboard'
import PortalSelector from './PortalSelector'

type Tab = 'board' | 'clients' | 'pricing' | 'services' | 'settings' | 'master'

export default function AdminDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('board')
  const [driveAuthUrl, setDriveAuthUrl] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [driveAuthError, setDriveAuthError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [organization, setOrganization] = useState<{ inviteCode: string; inviteLink: string; name: string } | null>(null)
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loadingUserInfo, setLoadingUserInfo] = useState(false)

  // Check if user is master admin and fetch organization
  useEffect(() => {
    fetch('/api/admin/check')
      .then(res => res.json())
      .then(data => {
        setIsMasterAdmin(data.isMasterAdmin || false)
      })
      .catch(() => setIsMasterAdmin(false))

    // Fetch organization info for invite code (even if admin, they might also be a service provider)
    fetch('/api/admin/organization')
      .then(res => res.json())
      .then(data => {
        if (data.organization) {
          setOrganization({
            inviteCode: data.organization.inviteCode,
            inviteLink: data.organization.inviteLink,
            name: data.organization.name,
          })
        }
      })
      .catch(() => {})
  }, [isMasterAdmin])

  // Fetch user info when settings tab is opened
  useEffect(() => {
    if (activeTab === 'settings') {
      setLoadingUserInfo(true)
      fetch('/api/admin/user-info')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUserInfo(data.user)
            if (data.user.organization) {
              setOrganization({
                inviteCode: data.user.organization.inviteCode,
                inviteLink: data.user.organization.inviteLink,
                name: data.user.organization.name,
              })
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingUserInfo(false))
    }
  }, [activeTab])

  // Check for auth callback results
  useEffect(() => {
    const success = searchParams?.get('drive_auth_success')
    const token = searchParams?.get('refresh_token')
    const error = searchParams?.get('drive_auth_error')

    if (success === '1' && token) {
      setRefreshToken(token)
      setDriveAuthError(null)
      // Clean URL
      router.replace('/admin?tab=settings')
    } else if (error) {
      setDriveAuthError(error)
      router.replace('/admin?tab=settings')
    }
  }, [searchParams, router])

  // Fetch auth URL when settings tab is opened
  useEffect(() => {
    if (activeTab === 'settings') {
      fetch('/api/admin/drive/auth')
        .then(res => res.json())
        .then(data => {
          if (data.authUrl) {
            setDriveAuthUrl(data.authUrl)
          }
        })
        .catch(err => {
          console.error('Error fetching auth URL:', err)
        })
    }
  }, [activeTab])

  const handleCopyToken = () => {
    if (refreshToken) {
      navigator.clipboard.writeText(refreshToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyInvite = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text)
    setCopiedInvite(`${type}-${text}`)
    setTimeout(() => setCopiedInvite(null), 2000)
  }

  const handleRunMigration = async () => {
    if (!confirm('This will run database migrations. Continue?')) return

    setMigrating(true)
    setMigrationResult(null)

    try {
      const res = await fetch('/api/admin/migrate', {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        setMigrationResult({
          success: true,
          message: data.message || 'Migration completed successfully',
        })
      } else {
        setMigrationResult({
          success: false,
          message: data.error || 'Migration failed',
        })
      }
    } catch (error: any) {
      setMigrationResult({
        success: false,
        message: error?.message || 'Failed to run migration',
      })
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <nav className="bg-[#1C1C1E] border-b border-[#38383A]/50 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#FFFFFF]">Service Provider Dashboard</h1>
              {organization && (
                <p className="text-[13px] text-[#8E8E93] mt-1">{organization.name}</p>
              )}
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

      {/* Tabs */}
      <div className="bg-[#1C1C1E] border-b border-[#38383A]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('board')}
              className={`${
                activeTab === 'board'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2 sm:gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[14px] sm:text-[15px] transition-colors`}
            >
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Task Board</span>
              <span className="sm:hidden">Tasks</span>
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`${
                activeTab === 'clients'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2 sm:gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[14px] sm:text-[15px] transition-colors`}
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Clients</span>
              <span className="sm:hidden">Clients</span>
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`${
                activeTab === 'pricing'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2 sm:gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[14px] sm:text-[15px] transition-colors`}
            >
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              Pricing
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`${
                activeTab === 'services'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2 sm:gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[14px] sm:text-[15px] transition-colors`}
            >
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
              Services
            </button>
            {isMasterAdmin && (
              <button
                onClick={() => setActiveTab('master')}
                className={`${
                  activeTab === 'master'
                    ? 'border-[#007AFF] text-[#007AFF]'
                    : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
                } flex items-center gap-2 sm:gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[14px] sm:text-[15px] transition-colors`}
              >
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}
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
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'board' && <TaskTable />}
        {activeTab === 'clients' && <ClientsManagement />}
        {activeTab === 'pricing' && <PricingManagement />}
        {activeTab === 'services' && <ServicesManagement />}
        {activeTab === 'master' && isMasterAdmin && <MasterAdminDashboard />}
        
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Organization Header */}
            {userInfo?.organization && (
              <div className="bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 rounded-2xl p-6 border border-[#007AFF]/20">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-6 h-6 text-[#007AFF]" />
                  <h1 className="text-[24px] font-bold text-[#FFFFFF]">{userInfo.organization.name}</h1>
                </div>
                <p className="text-[15px] text-[#8E8E93]">
                  {userInfo.role === 'service_provider' ? 'Service Provider' : userInfo.role === 'client' ? 'Client' : 'User'}
                </p>
              </div>
            )}

            {/* Stats Cards */}
            {userInfo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-[#007AFF]" />
                  </div>
                  <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
                    {userInfo.organization?._count?.clients || userInfo._count?.clients || 0}
                  </div>
                  <div className="text-[15px] text-[#8E8E93]">Clients</div>
                </div>

                <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
                  <div className="flex items-center justify-between mb-4">
                    <FileText className="w-8 h-8 text-[#30D158]" />
                  </div>
                  <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
                    {userInfo.organization?._count?.tasks || userInfo._count?.tasks || 0}
                  </div>
                  <div className="text-[15px] text-[#8E8E93]">Tasks</div>
                </div>

                <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
                  <div className="flex items-center justify-between mb-4">
                    <CreditCard className="w-8 h-8 text-[#FF9500]" />
                  </div>
                  <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
                    {userInfo.organization?.subscription ? 
                      (userInfo.organization.subscription.plan === '1_month' ? '1M' :
                       userInfo.organization.subscription.plan === '3_month' ? '3M' : '6M') : 
                      '-'}
                  </div>
                  <div className="text-[15px] text-[#8E8E93]">Plan</div>
                </div>

                <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-[#AF52DE]" />
                  </div>
                  <div className="text-[32px] font-bold text-[#FFFFFF] mb-1">
                    {userInfo.organization?.subscription?.clientCount || 0}
                  </div>
                  <div className="text-[15px] text-[#8E8E93]">Invoice #</div>
                </div>
              </div>
            )}

            {/* Settings Content */}
            <div className="bg-[#1C1C1E] rounded-2xl p-8 border border-[#38383A]/30">
              <h2 className="text-[20px] font-semibold mb-6 text-[#FFFFFF]">Settings</h2>
            
            {/* User Information */}
            {userInfo && (
              <div className="mb-8 p-6 bg-[#2C2C2E] rounded-xl border border-[#38383A]/30">
                <h3 className="text-[17px] font-semibold mb-4 text-[#FFFFFF]">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Name
                    </label>
                    <p className="text-[15px] text-[#FFFFFF]">{userInfo.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Email
                    </label>
                    <p className="text-[15px] text-[#FFFFFF]">{userInfo.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Role
                    </label>
                    <p className="text-[15px] text-[#FFFFFF] capitalize">
                      {userInfo.role === 'service_provider' ? 'Service Provider' : 
                       userInfo.role === 'client' ? 'Client' : 
                       userInfo.role === 'master_admin' ? 'Admin' : userInfo.role}
                    </p>
                  </div>
                  {userInfo.organization?.subscription && (
                    <div>
                      <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                        Subscription Status
                      </label>
                      <p className="text-[15px] text-[#FFFFFF] capitalize">
                        {userInfo.organization.subscription.status}
                      </p>
                      <p className="text-[13px] text-[#8E8E93] mt-1">
                        Expires: {new Date(userInfo.organization.subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invite Code Section */}
            {organization && (
              <div className="mb-8 p-6 bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10 rounded-xl border border-[#007AFF]/20">
                <h3 className="text-[17px] font-semibold mb-4 text-[#FFFFFF] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#007AFF]" />
                  Client Invite Information
                </h3>
                <p className="text-[14px] text-[#8E8E93] mb-4">
                  Share your invite code or link with clients so they can join your organization.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Invite Code
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={organization.inviteCode}
                        className="flex-1 px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[17px] font-mono font-bold"
                      />
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

                  <div>
                    <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Invite Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={organization.inviteLink}
                        className="flex-1 px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[13px] font-mono truncate"
                      />
                      <button
                        onClick={() => handleCopyInvite(organization.inviteLink, 'link')}
                        className="px-4 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors flex items-center gap-2 text-[14px] font-semibold"
                      >
                        {copiedInvite === `link-${organization.inviteLink}` ? (
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
                        className="p-3 bg-[#2C2C2E] text-[#007AFF] rounded-xl hover:bg-[#38383A] transition-colors"
                        title="Open invite link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Google Drive OAuth Setup */}
            <div className="mb-8">
              <h3 className="text-[17px] font-semibold mb-4 text-[#FFFFFF]">Google Drive Integration</h3>
              
              {driveAuthError && (
                <div className="mb-4 p-4 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-[#FF3B30] mb-1">Authorization Error</p>
                    <p className="text-[14px] text-[#8E8E93]">{driveAuthError}</p>
                  </div>
                </div>
              )}

              {refreshToken ? (
                <div className="p-4 bg-[#34C759]/10 border border-[#34C759]/30 rounded-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <CheckCircle className="w-5 h-5 text-[#34C759] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[15px] font-semibold text-[#34C759] mb-2">Authorization Successful!</p>
                      <p className="text-[14px] text-[#8E8E93] mb-3">
                        Copy the refresh token below and add it to your Vercel environment variables as <code className="bg-[#000000] px-1.5 py-0.5 rounded text-[#007AFF]">GOOGLE_DRIVE_REFRESH_TOKEN</code>
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={refreshToken}
                          className="flex-1 px-3 py-2 bg-[#000000] border border-[#38383A] rounded-lg text-[#FFFFFF] text-[13px] font-mono"
                        />
                        <button
                          onClick={handleCopyToken}
                          className="px-4 py-2 bg-[#007AFF] text-[#FFFFFF] rounded-lg hover:bg-[#0051D5] transition-colors flex items-center gap-2 text-[14px] font-semibold"
                        >
                          <Copy className="w-4 h-4" />
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[14px] text-[#8E8E93] mb-4">
                    Authorize Google Drive access to enable file uploads. You'll need to add the refresh token to your Vercel environment variables.
                  </p>
                  {driveAuthUrl ? (
                    <a
                      href={driveAuthUrl}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors text-[15px] font-semibold"
                    >
                      Authorize Google Drive
                    </a>
                  ) : (
                    <p className="text-[14px] text-[#8E8E93]">Loading authorization URL...</p>
                  )}
                </div>
              )}
            </div>

            {/* Admin Access Setup / Unauthorize */}
            <div className="pt-8 border-t border-[#38383A]/30 mb-8">
              {!isMasterAdmin ? (
                <>
                  <h3 className="text-[17px] font-semibold mb-4 text-[#FFFFFF]">Admin Access</h3>
                  <p className="text-[14px] text-[#8E8E93] mb-4">
                    Enable admin access to view all organizations, clients, and platform statistics.
                  </p>
                  <button
                    onClick={async () => {
                      if (!confirm('This will set your account as admin. Continue?')) return
                      
                      try {
                        const session = await fetch('/api/auth/session').then(r => r.json())
                        const email = session?.user?.email
                        
                        if (!email) {
                          alert('Could not get your email. Please use the script instead.')
                          return
                        }

                        const res = await fetch('/api/admin/set-master-admin', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email }),
                        })

                        const data = await res.json()

                        if (res.ok) {
                          alert('Admin access enabled! Please refresh the page.')
                          window.location.reload()
                        } else {
                          alert(data.error || 'Failed to set admin')
                        }
                      } catch (error) {
                        console.error('Error:', error)
                        alert('Failed to set admin')
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors text-[15px] font-semibold"
                  >
                    Authorize as Admin
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-[17px] font-semibold mb-4 text-[#FFFFFF]">Admin Access</h3>
                  <p className="text-[14px] text-[#8E8E93] mb-4">
                    You currently have admin access. Click below to return to your regular admin view.
                  </p>
                  <button
                    onClick={async () => {
                      if (!confirm('This will remove your admin access. Continue?')) return
                      
                      try {
                        const res = await fetch('/api/admin/unauthorize-master-admin', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                        })

                        const data = await res.json()

                        if (res.ok) {
                          alert('Admin access removed! Please refresh the page.')
                          window.location.reload()
                        } else {
                          alert(data.error || 'Failed to remove admin access')
                        }
                      } catch (error) {
                        console.error('Error:', error)
                        alert('Failed to remove admin access')
                      }
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF3B30] text-[#FFFFFF] rounded-xl hover:bg-[#FF3B30]/80 transition-colors text-[15px] font-semibold"
                  >
                    Unauthorize Admin
                  </button>
                </>
              )}
            </div>

            {/* Database Migration */}
            <div className="pt-8 border-t border-[#38383A]/30">
              <h3 className="text-[17px] font-semibold mb-4 text-[#FFFFFF]">Database Migration</h3>
              <p className="text-[14px] text-[#8E8E93] mb-4">
                Run database migrations to create or update tables. This is needed when new features require database schema changes.
              </p>
              
              {migrationResult && (
                <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${
                  migrationResult.success
                    ? 'bg-[#34C759]/10 border border-[#34C759]/30'
                    : 'bg-[#FF3B30]/10 border border-[#FF3B30]/30'
                }`}>
                  {migrationResult.success ? (
                    <CheckCircle className="w-5 h-5 text-[#34C759] flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-[15px] font-semibold mb-1 ${
                      migrationResult.success ? 'text-[#34C759]' : 'text-[#FF3B30]'
                    }`}>
                      {migrationResult.success ? 'Migration Successful' : 'Migration Failed'}
                    </p>
                    <p className="text-[14px] text-[#8E8E93]">{migrationResult.message}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleRunMigration}
                disabled={migrating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[15px] font-semibold"
              >
                {migrating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Running Migration...
                  </>
                ) : (
                  'Run Database Migration'
                )}
              </button>
            </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

