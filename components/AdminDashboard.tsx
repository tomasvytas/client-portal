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
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <nav className="bg-[#1C1C1E] border-b border-[#38383A]/50 backdrop-blur-xl bg-opacity-80">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-[20px] font-semibold text-[#FFFFFF]">Admin Panel</h1>
            <div className="flex items-center gap-5">
              <button
                onClick={() => router.push('/')}
                className="text-[15px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                Client Portal
              </button>
              <button
                onClick={() => signOut()}
                className="text-[15px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div className="bg-[#1C1C1E] border-b border-[#38383A]/50">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('board')}
              className={`${
                activeTab === 'board'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[15px] transition-colors`}
            >
              <LayoutGrid className="w-5 h-5" />
              Task Board
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`${
                activeTab === 'pricing'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[15px] transition-colors`}
            >
              <DollarSign className="w-5 h-5" />
              Pricing
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${
                activeTab === 'settings'
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#FFFFFF] hover:border-[#38383A]'
              } flex items-center gap-2.5 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-[15px] transition-colors`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'board' && <TaskBoard />}
        {activeTab === 'pricing' && <PricingManagement />}
        {activeTab === 'settings' && (
          <div className="bg-[#1C1C1E] rounded-2xl p-8 border border-[#38383A]/30">
            <h2 className="text-[20px] font-semibold mb-4 text-[#FFFFFF]">Settings</h2>
            <p className="text-[#8E8E93] text-[15px]">Settings panel coming soon...</p>
          </div>
        )}
      </main>
    </div>
  )
}

