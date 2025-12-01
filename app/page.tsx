import { auth } from '@/lib/auth'
import Dashboard from '@/components/Dashboard'
import LandingPage from '@/components/LandingPage'

export default async function Home() {
  const session = await auth()
  
  if (!session) {
    return <LandingPage />
  }

  return <Dashboard />
}
