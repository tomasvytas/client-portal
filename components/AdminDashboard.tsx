'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Settings, LayoutGrid, DollarSign, CheckCircle, AlertCircle, Copy, Briefcase, Users, Shield } from 'lucide-react'
import PricingManagement from './PricingManagement'
import TaskTable from './TaskTable'
import ServicesManagement from './ServicesManagement'
import ClientsManagement from './ClientsManagement'
import MasterAdminDashboard from './MasterAdminDashboard'

type Tab = 'board' | 'clients' | 'pricing' | 'services' | 'settings' | 'master'

export default function AdminDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<Tab>('board')
  const [driveAuthUrl, setDriveAuthUrl] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [driveAuthError, setDriveAuthError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)

  // Check if user is master admin
  useEffect(() => {
    fetch('/api/admin/check')
      .then(res => res.json())
      .then(data => {
        setIsMasterAdmin(data.isMasterAdmin || false)
      })
      .catch(() => setIsMasterAdmin(false))
  }, [])

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
            <h1 className="text-[18px] sm:text-[20px] font-semibold text-[#FFFFFF]">Admin Panel</h1>
            <div className="flex items-center gap-3 sm:gap-5">
              <button
                onClick={() => router.push('/')}
                className="text-[13px] sm:text-[15px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                <span className="hidden sm:inline">Client Portal</span>
                <span className="sm:hidden">Portal</span>
              </button>
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
                <span className="hidden sm:inline">Master Admin</span>
                <span className="sm:hidden">Master</span>
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
          <div className="bg-[#1C1C1E] rounded-2xl p-8 border border-[#38383A]/30">
            <h2 className="text-[20px] font-semibold mb-6 text-[#FFFFFF]">Settings</h2>
            
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
        )}
      </main>
    </div>
  )
}

