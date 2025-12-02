'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { Users, Building2, Shield, Check } from 'lucide-react'

export default function PortalSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [isServiceProvider, setIsServiceProvider] = useState(false)
  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => {
    checkRoles()
  }, [session])

  const checkRoles = async () => {
    try {
      const res = await fetch('/api/admin/check')
      if (res.ok) {
        const data = await res.json()
        setIsAdmin(data.isAdmin || false)
        setIsMasterAdmin(data.isMasterAdmin || false)
        setIsServiceProvider(data.isServiceProvider || false)
      }
    } catch (error) {
      console.error('Error checking roles:', error)
    }
  }

  // Check if user is a client (but NOT a service provider - service providers shouldn't see client portal)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    const checkIfClient = async () => {
      // If user is a service provider, they should not see client portal
      if (isServiceProvider || isAdmin) {
        setIsClient(false)
        return
      }
      
      try {
        const res = await fetch('/api/client/providers')
        if (res.ok) {
          const data = await res.json()
          // If user has providers and is NOT a service provider, they can access client portal
          setIsClient(data.providers && data.providers.length > 0)
        }
      } catch (error) {
        setIsClient(false)
      }
    }
    if (session) {
      checkIfClient()
    }
  }, [session, isServiceProvider, isAdmin])

  // Only show for users with multiple roles (master admin can see all, or client-only users)
  const canSwitch = isMasterAdmin || (isClient && !isServiceProvider && !isAdmin)

  if (!canSwitch) {
    return null
  }

  const currentPortal = pathname?.startsWith('/admin') 
    ? (pathname.includes('tab=master') || pathname.includes('master') ? 'admin' : 'service-provider')
    : 'client'

  const portals = [
    {
      id: 'client',
      name: 'Client Portal',
      icon: Users,
      path: '/',
      available: isClient && !isServiceProvider && !isAdmin, // Only show if user is a client and NOT a service provider
      description: 'View your tasks and chat with service providers'
    },
    {
      id: 'service-provider',
      name: 'Service Provider',
      icon: Building2,
      path: '/admin',
      available: isServiceProvider || isAdmin,
      description: 'Manage your clients and tasks'
    },
    {
      id: 'admin',
      name: 'Admin Portal',
      icon: Shield,
      path: '/admin?tab=master',
      available: isMasterAdmin,
      description: 'Platform-wide overview and statistics'
    }
  ].filter(p => p.available)

  const handlePortalSwitch = (portal: typeof portals[0]) => {
    if (portal.id === 'admin' && !isMasterAdmin) {
      // Auto-enable admin access for testing account
      if (session?.user?.email === 'tv.vytas@gmail.com') {
        fetch('/api/admin/set-master-admin-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email }),
        }).then(() => {
          router.push(portal.path)
          setTimeout(() => window.location.reload(), 500)
        })
      }
    } else {
      router.push(portal.path)
    }
    setShowSelector(false)
  }

  const currentPortalData = portals.find(p => p.id === currentPortal)
  const CurrentIcon = currentPortalData?.icon

  return (
    <div className="relative">
      <button
        onClick={() => setShowSelector(!showSelector)}
        className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2E] hover:bg-[#38383A] rounded-xl text-[14px] font-semibold text-[#FFFFFF] transition-colors"
      >
        {CurrentIcon && <CurrentIcon className="w-4 h-4" />}
        <span className="hidden sm:inline">
          {currentPortalData?.name || 'Select Portal'}
        </span>
        <span className="sm:hidden">Portal</span>
      </button>

      {showSelector && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSelector(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 bg-[#1C1C1E] border border-[#38383A] rounded-2xl p-2 shadow-xl min-w-[280px]">
            <div className="text-[13px] font-semibold text-[#8E8E93] px-3 py-2 mb-1">
              Switch Portal
            </div>
            {portals.map((portal) => {
              const Icon = portal.icon
              const isActive = currentPortal === portal.id
              return (
                <button
                  key={portal.id}
                  onClick={() => handlePortalSwitch(portal)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-colors text-left ${
                    isActive
                      ? 'bg-[#007AFF]/20 text-[#007AFF]'
                      : 'hover:bg-[#2C2C2E] text-[#FFFFFF]'
                  }`}
                >
                  <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[15px] font-semibold">{portal.name}</div>
                      {isActive && <Check className="w-4 h-4 flex-shrink-0" />}
                    </div>
                    <div className="text-[13px] text-[#8E8E93] mt-0.5">
                      {portal.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

