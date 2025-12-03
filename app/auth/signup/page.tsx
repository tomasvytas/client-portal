import { Suspense } from 'react'
import SignUpClient from './signup-client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading...</div>
      </div>
    }>
      <SignUpClient />
    </Suspense>
  )
}
