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

  // Show portal selector if:
  // 1. Master admin (can see all portals)
  // 2. Service provider/admin (they'll only see Service Provider portal, not Client)
  // 3. Client-only users (they'll only see Client portal)
  const canSwitch = isMasterAdmin || isServiceProvider || isAdmin || isClient

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

  // Just display the portal name, no dropdown
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-[14px] font-semibold text-[#FFFFFF]">
      {CurrentIcon && <CurrentIcon className="w-4 h-4" />}
      <span className="hidden sm:inline">
        {currentPortalData?.name || 'Portal'}
      </span>
      <span className="sm:hidden">Portal</span>
    </div>
  )
}

