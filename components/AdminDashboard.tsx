'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Settings, LayoutGrid, DollarSign } from 'lucide-react'
import PricingManagement from './PricingManagement'
import TaskBoard from './TaskBoard'

type Tab = 'board' | 'pricing' | 'settings'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('board')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Client Portal
              </button>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('board')}
              className={`${
                activeTab === 'board'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <LayoutGrid className="w-5 h-5" />
              Task Board
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`${
                activeTab === 'pricing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <DollarSign className="w-5 h-5" />
              Pricing
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'board' && <TaskBoard />}
        {activeTab === 'pricing' && <PricingManagement />}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        )}
      </main>
    </div>
  )
}

