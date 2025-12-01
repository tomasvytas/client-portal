import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  const admin = await isAdmin()
  if (!admin) {
    redirect('/')
  }

  return <AdminDashboard />
}
