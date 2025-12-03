'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function SignUpClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const inviteCode = searchParams?.get('invite')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // If user is already logged in, try to add the provider automatically
    if (status === 'authenticated' && session?.user && inviteCode && !processing) {
      handleAddProviderForLoggedInUser(inviteCode)
    } else if (status === 'unauthenticated' && inviteCode) {
      // If not logged in, redirect to signin page with invite code
      router.push(`/auth/signin?invite=${inviteCode}`)
    } else if (!inviteCode) {
      // No invite code, redirect to signin
      router.push('/auth/signin')
    }
  }, [status, session, inviteCode, processing, router])

  const handleAddProviderForLoggedInUser = async (code: string) => {
    setProcessing(true)
    try {
      const res = await fetch('/api/client/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (res.ok) {
        // Successfully linked, redirect to dashboard
        router.push('/?providerAdded=true')
      } else {
        // If error, redirect to signin page with invite code so user can see the error
        router.push(`/auth/signin?invite=${code}&error=${encodeURIComponent(data.error || 'Failed to add provider')}`)
      }
    } catch (error) {
      console.error('Error adding provider:', error)
      // Redirect to signin page with invite code
      router.push(`/auth/signin?invite=${code}&error=Failed to add provider`)
    } finally {
      setProcessing(false)
    }
  }

  // If user is logged in and processing, show loading
  if (status === 'authenticated' && inviteCode && processing) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-[#8E8E93] text-[17px] font-medium">Adding service provider...</div>
      </div>
    )
  }

  // Show loading while checking session or redirecting
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
      <div className="text-[#8E8E93] text-[17px] font-medium">Loading...</div>
    </div>
  )
}

