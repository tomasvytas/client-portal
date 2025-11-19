'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface Pricing {
  id: string
  name: string
  category: string
  basePrice: number
  minPrice: number | null
  maxPrice: number | null
  description: string | null
  isActive: boolean
}

export default function PricingManagement() {
  const [pricings, setPricings] = useState<Pricing[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Partial<Pricing> & { description: string }>({
    name: '',
    category: 'general',
    basePrice: 0,
    minPrice: null,
    maxPrice: null,
    description: '',
    isActive: true,
  })

  useEffect(() => {
    fetchPricings()
  }, [])

  const fetchPricings = async () => {
    try {
      const res = await fetch('/api/admin/pricing')
      const data = await res.json()
      setPricings(data.pricings || [])
    } catch (error) {
      console.error('Error fetching pricings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        fetchPricings()
        setShowForm(false)
        setFormData({
          name: '',
          category: 'general',
          basePrice: 0,
          minPrice: null,
          maxPrice: null,
          description: '',
          isActive: true,
        })
      } else {
        alert('Failed to create pricing')
      }
    } catch (error) {
      console.error('Error creating pricing:', error)
      alert('Failed to create pricing')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/pricing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        fetchPricings()
        setEditingId(null)
        setFormData({
          name: '',
          category: 'general',
          basePrice: 0,
          minPrice: null,
          maxPrice: null,
          description: '',
          isActive: true,
        })
      } else {
        alert('Failed to update pricing')
      }
    } catch (error) {
      console.error('Error updating pricing:', error)
      alert('Failed to update pricing')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing?')) return

    try {
      const res = await fetch(`/api/admin/pricing/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchPricings()
      } else {
        alert('Failed to delete pricing')
      }
    } catch (error) {
      console.error('Error deleting pricing:', error)
      alert('Failed to delete pricing')
    }
  }

  const startEdit = (pricing: Pricing) => {
    setEditingId(pricing.id)
    setFormData({
      name: pricing.name,
      category: pricing.category,
      basePrice: pricing.basePrice,
      minPrice: pricing.minPrice,
      maxPrice: pricing.maxPrice,
      description: pricing.description ?? '',
      isActive: pricing.isActive,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowForm(false)
    setFormData({
      name: '',
      category: 'general',
      basePrice: 0,
      minPrice: null,
      maxPrice: null,
      description: '',
      isActive: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading pricings...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[28px] font-bold text-[#FFFFFF] tracking-tight">Pricing Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-[#007AFF] text-[#FFFFFF] text-[15px] font-semibold rounded-xl hover:bg-[#0051D5] transition-all duration-200 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add Pricing
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-[#1C1C1E] rounded-2xl p-6 mb-6 border border-[#38383A]/30">
          <h3 className="text-[20px] font-semibold mb-5 text-[#FFFFFF]">Create New Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[15px] font-semibold text-[#8E8E93] mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[#FFFFFF] placeholder:text-[#8E8E93] transition-all"
                placeholder="e.g., Video Production"
              />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#8E8E93] mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[#FFFFFF] transition-all"
              >
                <option value="video">Video</option>
                <option value="design">Design</option>
                <option value="web">Web</option>
                <option value="social">Social Media</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#8E8E93] mb-2">
                Base Price ($)
              </label>
              <input
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[#FFFFFF] transition-all"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#8E8E93] mb-2">
                Min Price ($) - Optional
              </label>
              <input
                type="number"
                value={formData.minPrice || ''}
                onChange={(e) => setFormData({ ...formData, minPrice: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[#FFFFFF] transition-all"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#8E8E93] mb-2">
                Max Price ($) - Optional
              </label>
              <input
                type="number"
                value={formData.maxPrice || ''}
                onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[#FFFFFF] transition-all"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#8E8E93] mb-2">
                Active
              </label>
              <select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[#FFFFFF] transition-all"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[15px] font-semibold text-[#8E8E93] mb-2">
                Description
              </label>
              <textarea
                value={formData.description ?? ''}
                onChange={(e) => {
                  const newFormData = { ...formData, description: e.target.value }
                  setFormData(newFormData)
                }}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50 text-[#FFFFFF] placeholder:text-[#8E8E93] transition-all"
                rows={3}
                placeholder="Optional description..."
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-[#007AFF] text-[#FFFFFF] text-[15px] font-semibold rounded-xl hover:bg-[#0051D5] transition-all duration-200 active:scale-95"
            >
              <Save className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-[#2C2C2E] text-[#FFFFFF] text-[15px] font-semibold rounded-xl hover:bg-[#38383A] transition-all duration-200 active:scale-95"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pricing List */}
      <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-[#38383A]/30">
        <table className="min-w-full divide-y divide-[#38383A]/30">
          <thead className="bg-[#2C2C2E]">
            <tr>
              <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                Name
              </th>
              <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                Category
              </th>
              <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                Base Price
              </th>
              <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                Price Range
              </th>
              <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                Status
              </th>
              <th className="px-6 py-4 text-right text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-[#1C1C1E] divide-y divide-[#38383A]/30">
            {pricings.map((pricing) => (
              <tr key={pricing.id}>
                {editingId === pricing.id ? (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                      >
                        <option value="video">Video</option>
                        <option value="design">Design</option>
                        <option value="web">Web</option>
                        <option value="social">Social Media</option>
                        <option value="general">General</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={formData.basePrice}
                        onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                        step="0.01"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[15px] text-[#8E8E93]">
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={formData.minPrice || ''}
                          onChange={(e) => setFormData({ ...formData, minPrice: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-20 px-3 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                          placeholder="Min"
                          step="0.01"
                        />
                        <span className="text-[#8E8E93]">-</span>
                        <input
                          type="number"
                          value={formData.maxPrice || ''}
                          onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-20 px-3 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                          placeholder="Max"
                          step="0.01"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={formData.isActive ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                        className="w-full px-3 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[15px] font-semibold">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleUpdate(pricing.id)}
                          className="text-[#007AFF] hover:text-[#0051D5] transition-colors p-2 hover:bg-[#2C2C2E] rounded-xl"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-[#8E8E93] hover:text-[#FFFFFF] transition-colors p-2 hover:bg-[#2C2C2E] rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-[15px] font-semibold text-[#FFFFFF]">
                      {pricing.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[15px] text-[#8E8E93]">
                      {pricing.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[15px] text-[#FFFFFF] font-semibold">
                      ${pricing.basePrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[15px] text-[#8E8E93]">
                      {pricing.minPrice || pricing.maxPrice
                        ? `$${pricing.minPrice?.toFixed(2) || '0'} - $${pricing.maxPrice?.toFixed(2) || '∞'}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-[13px] leading-5 font-semibold rounded-lg ${
                          pricing.isActive
                            ? 'bg-[#30D158]/20 text-[#30D158]'
                            : 'bg-[#8E8E93]/20 text-[#8E8E93]'
                        }`}
                      >
                        {pricing.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[15px] font-semibold">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(pricing)}
                          className="text-[#007AFF] hover:text-[#0051D5] transition-colors p-2 hover:bg-[#2C2C2E] rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pricing.id)}
                          className="text-[#FF3B30] hover:text-[#FF2D20] transition-colors p-2 hover:bg-[#2C2C2E] rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {pricings.length === 0 && (
          <div className="text-center py-12 text-[#8E8E93] text-[17px]">
            No pricings found. Create your first pricing above.
          </div>
        )}
      </div>
    </div>
  )
}

