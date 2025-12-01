'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'client' | 'service_provider' | ''>('')
  const [inviteCode, setInviteCode] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [subscriptionPlan, setSubscriptionPlan] = useState<'1_month' | '3_month' | '6_month' | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check for invite code in URL
  useEffect(() => {
    const invite = searchParams?.get('invite')
    if (invite) {
      setInviteCode(invite)
      setRole('client')
      setIsSignUp(true)
    }
  }, [searchParams])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        // Validate required fields based on role
        if (!role) {
          setError('Please select whether you are a Service Provider or Client')
          setLoading(false)
          return
        }

        if (role === 'service_provider' && (!organizationName || !subscriptionPlan)) {
          setError('Please provide organization name and select a subscription plan')
          setLoading(false)
          return
        }

        if (role === 'client' && !inviteCode) {
          setError('Please enter an invite code to join a service provider')
          setLoading(false)
          return
        }

        // Sign up - create account via API
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            password, 
            name, 
            role,
            inviteCode: role === 'client' ? inviteCode : undefined,
            organizationName: role === 'service_provider' ? organizationName : undefined,
            subscriptionPlan: role === 'service_provider' ? subscriptionPlan : undefined,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create account')
        }

        // After signup, sign in
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          throw new Error('Failed to sign in after signup')
        }

        router.push('/')
      } else {
        // Sign in
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          throw new Error('Invalid email or password')
        }

        router.push('/')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Image
            src="/Logo.svg"
            alt="Task Chat Logo"
            width={200}
            height={80}
            className="object-contain"
            priority
          />
        </div>

        {/* Sign In Card */}
        <div className="bg-[#1C1C1E] rounded-2xl p-8 border border-[#38383A]/50 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-[32px] font-bold text-[#FFFFFF] mb-3">
              {isSignUp ? 'Create Account' : 'Welcome to Task Chat'}
            </h1>
            <p className="text-[17px] text-[#8E8E93]">
              {isSignUp ? 'Sign up to get started' : 'Sign in to continue to your client portal'}
            </p>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="mb-6 space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label htmlFor="name" className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={isSignUp}
                    className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-3">
                    I am a...
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRole('service_provider')
                        setInviteCode('')
                        setError('')
                      }}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        role === 'service_provider'
                          ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                          : 'border-[#38383A] bg-[#2C2C2E] text-[#FFFFFF] hover:border-[#38383A]/70'
                      }`}
                    >
                      <div className="text-[15px] font-semibold">Service Provider</div>
                      <div className="text-[13px] text-[#8E8E93] mt-1">I offer services</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRole('client')
                        setOrganizationName('')
                        setSubscriptionPlan('')
                        setError('')
                      }}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        role === 'client'
                          ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                          : 'border-[#38383A] bg-[#2C2C2E] text-[#FFFFFF] hover:border-[#38383A]/70'
                      }`}
                    >
                      <div className="text-[15px] font-semibold">Client</div>
                      <div className="text-[13px] text-[#8E8E93] mt-1">I need services</div>
                    </button>
                  </div>
                </div>

                {/* Service Provider Fields */}
                {role === 'service_provider' && (
                  <>
                    <div>
                      <label htmlFor="organizationName" className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                        Organization Name
                      </label>
                      <input
                        id="organizationName"
                        type="text"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
                        placeholder="My Creative Agency"
                      />
                    </div>

                    {/* Subscription Plans */}
                    <div>
                      <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-3">
                        Choose Subscription Plan
                      </label>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setSubscriptionPlan('1_month')}
                          className={`w-full px-4 py-4 rounded-xl border-2 text-left transition-all ${
                            subscriptionPlan === '1_month'
                              ? 'border-[#007AFF] bg-[#007AFF]/10'
                              : 'border-[#38383A] bg-[#2C2C2E] hover:border-[#38383A]/70'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-[15px] font-semibold text-[#FFFFFF]">1 Month</div>
                              <div className="text-[13px] text-[#8E8E93] mt-1">€50/month + €10 per client</div>
                            </div>
                            <div className="text-[17px] font-bold text-[#007AFF]">€50</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubscriptionPlan('3_month')}
                          className={`w-full px-4 py-4 rounded-xl border-2 text-left transition-all ${
                            subscriptionPlan === '3_month'
                              ? 'border-[#007AFF] bg-[#007AFF]/10'
                              : 'border-[#38383A] bg-[#2C2C2E] hover:border-[#38383A]/70'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-[15px] font-semibold text-[#FFFFFF]">3 Months</div>
                              <div className="text-[13px] text-[#8E8E93] mt-1">€35/month + €8 per client</div>
                            </div>
                            <div className="text-[17px] font-bold text-[#007AFF]">€105</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubscriptionPlan('6_month')}
                          className={`w-full px-4 py-4 rounded-xl border-2 text-left transition-all ${
                            subscriptionPlan === '6_month'
                              ? 'border-[#007AFF] bg-[#007AFF]/10'
                              : 'border-[#38383A] bg-[#2C2C2E] hover:border-[#38383A]/70'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-[15px] font-semibold text-[#FFFFFF]">6 Months</div>
                              <div className="text-[13px] text-[#8E8E93] mt-1">€25/month + €7 per client</div>
                            </div>
                            <div className="text-[17px] font-bold text-[#007AFF]">€150</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Client Fields */}
                {role === 'client' && (
                  <div>
                    <label htmlFor="inviteCode" className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                      Invite Code
                    </label>
                    <input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      required
                      className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all uppercase"
                      placeholder="ENTER INVITE CODE"
                    />
                    <p className="text-[13px] text-[#8E8E93] mt-2">
                      Get this code from your service provider
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl">
                <p className="text-[14px] text-[#FF3B30]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-[#007AFF] text-[#FFFFFF] rounded-xl font-semibold text-[17px] hover:bg-[#0051D5] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#38383A]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1C1C1E] text-[#8E8E93] text-[15px]">Or</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#FFFFFF] text-[#000000] rounded-xl font-semibold text-[17px] hover:bg-[#F5F5F7] transition-all duration-200 active:scale-[0.98] shadow-lg mb-6"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Toggle Sign Up/Sign In */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setEmail('')
                setPassword('')
                setName('')
                setRole('')
                setInviteCode('')
                setOrganizationName('')
                setSubscriptionPlan('')
              }}
              className="text-[#007AFF] hover:text-[#0051D5] text-[15px] font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          <p className="text-center text-[13px] text-[#8E8E93] mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}

