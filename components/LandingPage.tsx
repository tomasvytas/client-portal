'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowRight, Check, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()

  const plans = [
    {
      id: '1_month',
      name: '1 Month',
      price: '€50',
      period: 'per month',
      clientFee: '+ €10 per client',
      description: 'Perfect for trying out the platform',
      features: [
        'Full access to all features',
        'Unlimited tasks',
        'AI-powered chat assistant',
        'Google Drive integration',
        'Client management',
      ],
      popular: false,
    },
    {
      id: '3_month',
      name: '3 Months',
      price: '€105',
      period: 'total (€35/month)',
      clientFee: '+ €8 per client',
      description: 'Best value for growing businesses',
      features: [
        'Everything in 1 Month',
        'Save €45 compared to monthly',
        'Priority support',
        'Advanced analytics',
        'Custom branding',
      ],
      popular: true,
    },
    {
      id: '6_month',
      name: '6 Months',
      price: '€150',
      period: 'total (€25/month)',
      clientFee: '+ €7 per client',
      description: 'Maximum savings for established teams',
      features: [
        'Everything in 3 Months',
        'Save €150 compared to monthly',
        'Dedicated account manager',
        'API access',
        'White-label options',
      ],
      popular: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <nav className="bg-[#1C1C1E]/80 backdrop-blur-xl border-b border-[#38383A]/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Image
              src="/Logo.svg"
              alt="Task Chat"
              width={120}
              height={40}
              className="h-8 w-auto"
              priority
            />
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/auth/signin')}
                className="text-[15px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/auth/signin')}
                className="px-4 py-2 bg-[#007AFF] text-[#FFFFFF] rounded-xl text-[15px] font-semibold hover:bg-[#0051D5] transition-all duration-200 active:scale-95"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF]/10 border border-[#007AFF]/30 rounded-full text-[#007AFF] text-[13px] font-semibold mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Client Communication Platform
          </div>
          
          <h1 className="text-[48px] sm:text-[64px] lg:text-[80px] font-bold text-[#FFFFFF] mb-6 leading-tight tracking-tight">
            Turn Conversations Into
            <br />
            <span className="bg-gradient-to-r from-[#007AFF] to-[#5856D6] bg-clip-text text-transparent">
              Actionable Briefs
            </span>
          </h1>
          
          <p className="text-[20px] sm:text-[24px] text-[#8E8E93] mb-12 max-w-3xl mx-auto leading-relaxed">
            Streamline your client communication with AI that gathers requirements, 
            manages tasks, and creates professional briefs automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.push('/auth/signin')}
              className="px-8 py-4 bg-[#007AFF] text-[#FFFFFF] rounded-xl text-[17px] font-semibold hover:bg-[#0051D5] transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const plansSection = document.getElementById('pricing')
                plansSection?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-8 py-4 bg-[#2C2C2E] text-[#FFFFFF] rounded-xl text-[17px] font-semibold hover:bg-[#38383A] transition-all duration-200 active:scale-95"
            >
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1C1C1E]/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[40px] font-bold text-[#FFFFFF] text-center mb-16">
            Everything You Need to Manage Client Projects
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'AI Chat Assistant',
                description: 'Intelligent Kato AI gathers all project requirements through natural conversation',
                icon: '💬',
              },
              {
                title: 'Auto-Generated Briefs',
                description: 'Professional brief documents created automatically and stored in Google Drive',
                icon: '📄',
              },
              {
                title: 'Multi-Client Management',
                description: 'Manage multiple clients and projects from one unified dashboard',
                icon: '👥',
              },
              {
                title: 'Task Tracking',
                description: 'Track project status, deadlines, and pricing all in one place',
                icon: '✅',
              },
              {
                title: 'Asset Management',
                description: 'Upload, organize, and analyze client assets with AI-powered insights',
                icon: '📁',
              },
              {
                title: 'Product Analysis',
                description: 'Automatically analyze client products and generate brand guidelines',
                icon: '🔍',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30 hover:border-[#007AFF]/50 transition-all duration-200"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-[20px] font-semibold text-[#FFFFFF] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[15px] text-[#8E8E93] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold text-[#FFFFFF] mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-[20px] text-[#8E8E93] max-w-2xl mx-auto">
              Choose the plan that works for you. All plans include full access to all features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-[#1C1C1E] rounded-2xl p-8 border-2 transition-all duration-200 ${
                  plan.popular
                    ? 'border-[#007AFF] scale-105 shadow-2xl shadow-[#007AFF]/20'
                    : 'border-[#38383A]/30 hover:border-[#38383A]/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#007AFF] text-[#FFFFFF] rounded-full text-[13px] font-semibold">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-[24px] font-bold text-[#FFFFFF] mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-[15px] text-[#8E8E93] mb-4">
                    {plan.description}
                  </p>
                  <div className="mb-2">
                    <span className="text-[48px] font-bold text-[#FFFFFF]">
                      {plan.price}
                    </span>
                    <span className="text-[15px] text-[#8E8E93] ml-2">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#8E8E93]">
                    {plan.clientFee}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#30D158] flex-shrink-0 mt-0.5" />
                      <span className="text-[15px] text-[#FFFFFF]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => router.push('/auth/signin')}
                  className={`w-full py-4 rounded-xl text-[17px] font-semibold transition-all duration-200 active:scale-95 ${
                    plan.popular
                      ? 'bg-[#007AFF] text-[#FFFFFF] hover:bg-[#0051D5]'
                      : 'bg-[#2C2C2E] text-[#FFFFFF] hover:bg-[#38383A]'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-[15px] text-[#8E8E93] mt-12">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[#007AFF]/10 to-[#5856D6]/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[40px] font-bold text-[#FFFFFF] mb-6">
            Ready to Transform Your Client Communication?
          </h2>
          <p className="text-[20px] text-[#8E8E93] mb-8">
            Join service providers who are already streamlining their workflow with AI-powered briefs.
          </p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-8 py-4 bg-[#007AFF] text-[#FFFFFF] rounded-xl text-[17px] font-semibold hover:bg-[#0051D5] transition-all duration-200 active:scale-95 flex items-center gap-2 mx-auto"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#38383A]/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/Logo.svg"
                alt="Task Chat"
                width={100}
                height={33}
                className="h-8 w-auto opacity-60"
              />
              <span className="text-[13px] text-[#8E8E93]">
                © 2024 Task Chat. All rights reserved.
              </span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-[13px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-[13px] text-[#8E8E93] hover:text-[#FFFFFF] transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

