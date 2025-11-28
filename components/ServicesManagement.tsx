'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string | null
  keywords: string[]
  isActive: boolean
}

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    keywords: string // Store as string for input, convert to array on submit
    isActive: boolean
  }>({
    name: '',
    description: '',
    keywords: '',
    isActive: true,
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/admin/services')
      const data = await res.json()
      setServices(data.services || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name) {
      alert('Service name is required')
      return
    }

    try {
      const keywords = formData.keywords
        ? formData.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : []

      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords,
        }),
      })

      if (res.ok) {
        fetchServices()
        setShowForm(false)
        setFormData({
          name: '',
          description: '',
          keywords: '',
          isActive: true,
        })
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create service')
      }
    } catch (error) {
      console.error('Error creating service:', error)
      alert('Failed to create service')
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      const keywords = formData.keywords
        ? formData.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
        : []

      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords,
        }),
      })

      if (res.ok) {
        fetchServices()
        setEditingId(null)
        setFormData({
          name: '',
          description: '',
          keywords: '',
          isActive: true,
        })
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update service')
      }
    } catch (error) {
      console.error('Error updating service:', error)
      alert('Failed to update service')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchServices()
      } else {
        alert('Failed to delete service')
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Failed to delete service')
    }
  }

  const startEdit = (service: Service) => {
    setEditingId(service.id)
    setFormData({
      name: service.name,
      description: service.description || '',
      keywords: service.keywords.join(', '),
      isActive: service.isActive,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowForm(false)
    setFormData({
      name: '',
      description: '',
      keywords: '',
      isActive: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading services...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[24px] font-semibold text-[#FFFFFF]">Services</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors text-[15px] font-semibold"
        >
          <Plus className="w-5 h-5" />
          Add Service
        </button>
      </div>

      {showForm && (
        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30 mb-6">
          <h3 className="text-[20px] font-semibold text-[#FFFFFF] mb-4">Add New Service</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                Service Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50"
                placeholder="e.g., Video Production"
              />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50"
                rows={3}
                placeholder="Brief description of the service"
              />
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                Keywords (comma-separated) *
              </label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50"
                placeholder="e.g., video, film, animation, production"
              />
              <p className="text-[13px] text-[#8E8E93] mt-2">
                Keywords help the AI identify when clients ask about this service
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-[#38383A] bg-[#2C2C2E] text-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/50"
                />
                <span className="text-[15px] text-[#FFFFFF]">Active</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors text-[15px] font-semibold"
              >
                <Save className="w-5 h-5" />
                Create
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-6 py-3 bg-[#2C2C2E] text-[#FFFFFF] rounded-xl hover:bg-[#38383A] transition-colors text-[15px] font-semibold"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#2C2C2E]">
              <tr>
                <th className="px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF]">Name</th>
                <th className="px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF]">Description</th>
                <th className="px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF]">Keywords</th>
                <th className="px-6 py-4 text-left text-[15px] font-semibold text-[#FFFFFF]">Status</th>
                <th className="px-6 py-4 text-right text-[15px] font-semibold text-[#FFFFFF]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#8E8E93] text-[15px]">
                    No services yet. Add your first service to get started.
                  </td>
                </tr>
              ) : (
                services.map((service) =>
                  editingId === service.id ? (
                    <tr key={service.id} className="border-t border-[#38383A]/30">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[13px] font-semibold text-[#FFFFFF] mb-2">
                              Service Name *
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-4 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-lg text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-semibold text-[#FFFFFF] mb-2">
                              Description
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-4 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-lg text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-[13px] font-semibold text-[#FFFFFF] mb-2">
                              Keywords (comma-separated) *
                            </label>
                            <input
                              type="text"
                              value={formData.keywords}
                              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                              className="w-full px-4 py-2 bg-[#2C2C2E] border border-[#38383A] rounded-lg text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 rounded border-[#38383A] bg-[#2C2C2E] text-[#007AFF]"
                              />
                              <span className="text-[13px] text-[#FFFFFF]">Active</span>
                            </label>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleUpdate(service.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-[#FFFFFF] rounded-lg hover:bg-[#0051D5] transition-colors text-[14px] font-semibold"
                            >
                              <Save className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2E] text-[#FFFFFF] rounded-lg hover:bg-[#38383A] transition-colors text-[14px] font-semibold"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={service.id} className="border-t border-[#38383A]/30 hover:bg-[#2C2C2E]/50">
                      <td className="px-6 py-4 text-[15px] text-[#FFFFFF] font-medium">{service.name}</td>
                      <td className="px-6 py-4 text-[15px] text-[#8E8E93]">
                        {service.description || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {service.keywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-[#2C2C2E] text-[#007AFF] rounded-lg text-[13px] font-medium"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-lg text-[13px] font-semibold ${
                            service.isActive
                              ? 'bg-[#34C759]/10 text-[#34C759]'
                              : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                          }`}
                        >
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(service)}
                            className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

