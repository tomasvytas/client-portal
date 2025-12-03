import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'
import LandingPage from '@/components/LandingPage'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const session = await auth()
  
  if (!session) {
    return <LandingPage />
  }

  // Check if user is a service provider or admin - redirect to admin portal
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, isMasterAdmin: true },
    })

    if (user && (user.role === 'service_provider' || user.role === 'admin' || user.isMasterAdmin)) {
      redirect('/admin')
    }
  }

  return <Dashboard />
}
