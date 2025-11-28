import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ProductAnalysis from '@/components/ProductAnalysis'
import Image from 'next/image'
import { signOut } from '@/lib/auth'

export default async function ProductsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <nav className="bg-[#1C1C1E] border-b border-[#38383A]/50 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Image src="/Logo.svg" alt="Client Portal Logo" width={120} height={40} className="h-10 w-auto" />
            <div className="flex items-center gap-5">
              <a
                href="/"
                className="text-[15px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                Dashboard
              </a>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/auth/signin' })
                }}
              >
                <button
                  type="submit"
                  className="text-[15px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <ProductAnalysis />
      </main>
    </div>
  )
}

