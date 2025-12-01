import { NextResponse } from 'next/server'
import { isAdmin, isMasterAdmin, isServiceProvider } from '@/lib/admin'

export async function GET() {
  const admin = await isAdmin()
  const masterAdmin = await isMasterAdmin()
  const serviceProvider = await isServiceProvider()
  
  return NextResponse.json({ 
    isAdmin: admin,
    isMasterAdmin: masterAdmin,
    isServiceProvider: serviceProvider,
  })
}

