'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Settings, Lock, User, Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ClientSettings() {
  const { data: session } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)
  const [companyMessage, setCompanyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/client/stats')
      if (res.ok) {
        const data = await res.json()
        if (data.stats?.companyName) {
          setCompanyName(data.stats.companyName)
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All fields are required' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/client/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' })
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Failed to change password' })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setCompanyMessage(null)

    if (!companyName.trim()) {
      setCompanyMessage({ type: 'error', text: 'Company name is required' })
      return
    }

    setSavingCompany(true)
    try {
      const res = await fetch('/api/client/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        setCompanyMessage({ type: 'success', text: 'Company name saved successfully' })
        // Refresh stats to get updated company name
        await fetchStats()
      } else {
        setCompanyMessage({ type: 'error', text: data.error || 'Failed to save company name' })
      }
    } catch (error) {
      setCompanyMessage({ type: 'error', text: 'Failed to save company name' })
    } finally {
      setSavingCompany(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-[24px] font-bold text-[#FFFFFF] mb-2">Settings</h2>
        <p className="text-[15px] text-[#8E8E93]">Manage your account settings and preferences</p>
      </div>

      {/* Profile Information */}
      <div className="bg-[#1C1C1E] rounded-2xl p-6 sm:p-8 border border-[#38383A]/30">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-[#007AFF]" />
          <h3 className="text-[20px] font-semibold text-[#FFFFFF]">Profile Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
              Name
            </label>
            <p className="text-[15px] text-[#FFFFFF]">{session?.user?.name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
              Email
            </label>
            <p className="text-[15px] text-[#FFFFFF]">{session?.user?.email || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Company Name */}
      <div className="bg-[#1C1C1E] rounded-2xl p-6 sm:p-8 border border-[#38383A]/30">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-6 h-6 text-[#007AFF]" />
          <h3 className="text-[20px] font-semibold text-[#FFFFFF]">Company Information</h3>
        </div>
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
            />
          </div>
          {companyMessage && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${
              companyMessage.type === 'success'
                ? 'bg-[#34C759]/10 border border-[#34C759]/30'
                : 'bg-[#FF3B30]/10 border border-[#FF3B30]/30'
            }`}>
              {companyMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-[#34C759] flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-[15px] ${
                companyMessage.type === 'success' ? 'text-[#34C759]' : 'text-[#FF3B30]'
              }`}>
                {companyMessage.text}
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={savingCompany || !companyName.trim()}
            className="px-6 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[15px] font-semibold flex items-center gap-2"
          >
            {savingCompany ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Company Name'
            )}
          </button>
        </form>
      </div>

      {/* Password Change */}
      <div className="bg-[#1C1C1E] rounded-2xl p-6 sm:p-8 border border-[#38383A]/30">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-[#007AFF]" />
          <h3 className="text-[20px] font-semibold text-[#FFFFFF]">Change Password</h3>
        </div>
        <p className="text-[14px] text-[#8E8E93] mb-6">
          If you signed up with Google OAuth, you won't have a password. You can only change your password if you created an account with email and password.
        </p>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 characters)"
              className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
            />
          </div>
          {passwordMessage && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${
              passwordMessage.type === 'success'
                ? 'bg-[#34C759]/10 border border-[#34C759]/30'
                : 'bg-[#FF3B30]/10 border border-[#FF3B30]/30'
            }`}>
              {passwordMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-[#34C759] flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#FF3B30] flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-[15px] ${
                passwordMessage.type === 'success' ? 'text-[#34C759]' : 'text-[#FF3B30]'
              }`}>
                {passwordMessage.text}
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="px-6 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[15px] font-semibold flex items-center gap-2"
          >
            {changingPassword ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

