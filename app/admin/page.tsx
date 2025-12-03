import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isAdmin, isServiceProvider } from '@/lib/admin'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Allow both service providers and admins to access this page
  // Service providers see their dashboard, admins see admin features
  const admin = await isAdmin()
  const serviceProvider = await isServiceProvider()
  
  if (!admin && !serviceProvider) {
    redirect('/')
  }

  return <AdminDashboard />
}
