'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, CheckCircle, XCircle, ExternalLink, FileText, Trash2, X, Edit, Save } from 'lucide-react'

interface Product {
  id: string
  name: string
  websiteUrl: string | null
  productType: string | null
  brandGuidelines: string | null
  analysisData: any | null
  status: string
  createdAt: string
  updatedAt: string
}

export default function ProductAnalysis() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: '',
    websiteUrl: '',
    productType: '',
    brandGuidelines: '',
  })
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    websiteUrl: '',
    productName: '',
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  // Poll for updates if there are products in analyzing state
  useEffect(() => {
    const hasAnalyzing = products.some(p => p.status === 'analyzing' || p.status === 'pending')
    
    if (hasAnalyzing) {
      const interval = setInterval(() => {
        fetchProducts()
      }, 5000) // Poll every 5 seconds
      
      return () => clearInterval(interval)
    }
  }, [products])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.websiteUrl) {
      alert('Please enter a website URL')
      return
    }

    setAnalyzing(true)
    try {
      const res = await fetch('/api/products/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: formData.websiteUrl,
          productName: formData.productName || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setFormData({ websiteUrl: '', productName: '' })
        setShowForm(false)
        fetchProducts() // Refresh list
        alert('Analysis started! This may take a few minutes. Check back soon.')
      } else {
        alert(data.error || 'Failed to start analysis')
      }
    } catch (error) {
      console.error('Error starting analysis:', error)
      alert('Failed to start analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleProductClick = async (product: Product) => {
    // Fetch full product details
    try {
      const res = await fetch(`/api/products/${product.id}`)
      const data = await res.json()
      if (res.ok && data.product) {
        setSelectedProduct(data.product)
        setEditData({
          name: data.product.name || '',
          websiteUrl: data.product.websiteUrl || '',
          productType: data.product.productType || '',
          brandGuidelines: data.product.brandGuidelines || '',
        })
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error fetching product details:', error)
      // Fallback to the product from list
      setSelectedProduct(product)
      setEditData({
        name: product.name || '',
        websiteUrl: product.websiteUrl || '',
        productType: product.productType || '',
        brandGuidelines: product.brandGuidelines || '',
      })
      setIsEditing(false)
    }
  }

  const handleSave = async () => {
    if (!selectedProduct) return

    setSaving(true)
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      const data = await res.json()
      if (res.ok) {
        setIsEditing(false)
        fetchProducts() // Refresh list
        // Update selected product
        setSelectedProduct(data.product)
        alert('Product updated successfully!')
      } else {
        alert(data.error || 'Failed to update product')
      }
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (productId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation() // Prevent opening modal when clicking delete
    }
    
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return
    }

    setDeletingId(productId)
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchProducts() // Refresh list
        if (selectedProduct?.id === productId) {
          setSelectedProduct(null) // Close modal if deleting selected product
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    } finally {
      setDeletingId(null)
    }
  }

  const getAnalysisProgress = (product: Product) => {
    if (product.status !== 'analyzing' && product.status !== 'pending') {
      return null
    }

    // Calculate approximate progress based on time elapsed
    const createdAt = new Date(product.createdAt).getTime()
    const now = Date.now()
    const elapsed = now - createdAt
    const estimatedTotal = 120000 // 2 minutes estimated
    const progress = Math.min(95, Math.floor((elapsed / estimatedTotal) * 100))

    return progress
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#34C759]/10 text-[#34C759]'
      case 'analyzing':
        return 'bg-[#007AFF]/10 text-[#007AFF]'
      case 'failed':
        return 'bg-[#FF3B30]/10 text-[#FF3B30]'
      default:
        return 'bg-[#8E8E93]/10 text-[#8E8E93]'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'analyzing':
        return <Loader2 className="w-4 h-4 animate-spin" />
      case 'failed':
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#8E8E93] text-[17px] font-medium">Loading products...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-[24px] font-semibold text-[#FFFFFF] mb-2">Product Analysis</h2>
          <p className="text-[15px] text-[#8E8E93]">
            Analyze your product or brand website to generate comprehensive brand guidelines. The AI will understand your product better when you mention it in chat.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors text-[15px] font-semibold"
        >
          <Search className="w-5 h-5" />
          Analyze Product
        </button>
      </div>

      {showForm && (
        <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-[#38383A]/30 mb-6">
          <h3 className="text-[20px] font-semibold text-[#FFFFFF] mb-4">New Product Analysis</h3>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                Website URL *
              </label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://www.example.com"
                required
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50"
              />
              <p className="text-[13px] text-[#8E8E93] mt-2">
                Enter the main website URL of your product or brand
              </p>
            </div>
            <div>
              <label className="block text-[15px] font-semibold text-[#FFFFFF] mb-2">
                Product Name (Optional)
              </label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="e.g., Greenies Dog Treats"
                className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:border-[#007AFF]/50"
              />
              <p className="text-[13px] text-[#8E8E93] mt-2">
                If not provided, the AI will infer the name from the website
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={analyzing}
                className="flex items-center gap-2 px-6 py-3 bg-[#007AFF] text-[#FFFFFF] rounded-xl hover:bg-[#0051D5] transition-colors text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Start Analysis
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormData({ websiteUrl: '', productName: '' })
                }}
                className="px-6 py-3 bg-[#2C2C2E] text-[#FFFFFF] rounded-xl hover:bg-[#38383A] transition-colors text-[15px] font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/30 overflow-hidden">
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-[#8E8E93] mx-auto mb-4" />
            <p className="text-[17px] text-[#8E8E93] mb-2">No products analyzed yet</p>
            <p className="text-[15px] text-[#8E8E93]">
              Click "Analyze Product" to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#38383A]/30">
            {products.map((product) => {
              const progress = getAnalysisProgress(product)
              const isDeleting = deletingId === product.id

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="p-6 hover:bg-[#2C2C2E]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-[17px] font-semibold text-[#FFFFFF]">
                          {product.name}
                        </h3>
                        <span
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[13px] font-semibold ${getStatusColor(
                            product.status
                          )}`}
                        >
                          {getStatusIcon(product.status)}
                          {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                        </span>
                      </div>
                      
                      {/* Progress Bar for Analyzing Status */}
                      {(product.status === 'analyzing' || product.status === 'pending') && progress !== null && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[13px] text-[#8E8E93]">Analyzing...</span>
                            <span className="text-[13px] text-[#8E8E93]">{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-[#2C2C2E] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#007AFF] rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {product.productType && (
                        <p className="text-[15px] text-[#8E8E93] mb-2">
                          Type: {product.productType}
                        </p>
                      )}
                      {product.websiteUrl && (
                        <a
                          href={product.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[#007AFF] hover:text-[#0051D5] text-[14px] transition-colors mb-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="truncate">{product.websiteUrl}</span>
                        </a>
                      )}
                      <p className="text-[13px] text-[#8E8E93] mt-3">
                        Created: {formatDate(product.createdAt)}
                      </p>
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDelete(product.id, e)}
                      disabled={isDeleting}
                      className="flex-shrink-0 p-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete product"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] rounded-2xl border border-[#38383A]/50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#38383A]/30">
              <div className="flex items-center gap-3">
                <h3 className="text-[20px] font-semibold text-[#FFFFFF]">
                  {isEditing ? 'Edit Product' : 'Product Details'}
                </h3>
                <span
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[13px] font-semibold ${getStatusColor(
                    selectedProduct.status
                  )}`}
                >
                  {getStatusIcon(selectedProduct.status)}
                  {selectedProduct.status.charAt(0).toUpperCase() + selectedProduct.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && selectedProduct.status === 'completed' && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-lg transition-colors"
                    title="Edit product"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                )}
                {isEditing && (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-[#FFFFFF] rounded-lg hover:bg-[#0051D5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[14px] font-semibold"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        // Reset edit data
                        setEditData({
                          name: selectedProduct.name || '',
                          websiteUrl: selectedProduct.websiteUrl || '',
                          productType: selectedProduct.productType || '',
                          brandGuidelines: selectedProduct.brandGuidelines || '',
                        })
                      }}
                      className="px-4 py-2 bg-[#2C2C2E] text-[#FFFFFF] rounded-lg hover:bg-[#38383A] transition-colors text-[14px] font-semibold"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 text-[#8E8E93] hover:bg-[#2C2C2E] rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-[17px] font-semibold text-[#FFFFFF] mb-4">Basic Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Product Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                      />
                    ) : (
                      <p className="text-[15px] text-[#FFFFFF]">{selectedProduct.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Website URL
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={editData.websiteUrl}
                        onChange={(e) => setEditData({ ...editData, websiteUrl: e.target.value })}
                        className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                      />
                    ) : (
                      selectedProduct.websiteUrl ? (
                        <a
                          href={selectedProduct.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[#007AFF] hover:text-[#0051D5] text-[15px] transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {selectedProduct.websiteUrl}
                        </a>
                      ) : (
                        <p className="text-[15px] text-[#8E8E93]">Not provided</p>
                      )
                    )}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Product Type
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.productType}
                        onChange={(e) => setEditData({ ...editData, productType: e.target.value })}
                        className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                      />
                    ) : (
                      <p className="text-[15px] text-[#FFFFFF]">{selectedProduct.productType || 'Not specified'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Brand Guidelines */}
              {selectedProduct.status === 'completed' && (
                <div>
                  <h4 className="text-[17px] font-semibold text-[#FFFFFF] mb-4">Brand Guidelines</h4>
                  {isEditing ? (
                    <textarea
                      value={editData.brandGuidelines}
                      onChange={(e) => setEditData({ ...editData, brandGuidelines: e.target.value })}
                      className="w-full px-4 py-3 bg-[#2C2C2E] border border-[#38383A] rounded-xl text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 min-h-[300px] font-mono text-[14px]"
                      placeholder="Enter brand guidelines..."
                    />
                  ) : (
                    <div className="bg-[#2C2C2E] rounded-xl p-4 border border-[#38383A]/30">
                      {selectedProduct.brandGuidelines ? (
                        <pre className="text-[14px] text-[#FFFFFF] whitespace-pre-wrap font-sans">
                          {selectedProduct.brandGuidelines}
                        </pre>
                      ) : (
                        <p className="text-[15px] text-[#8E8E93]">No brand guidelines available</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Analysis Data Summary */}
              {selectedProduct.status === 'completed' && selectedProduct.analysisData && (
                <div>
                  <h4 className="text-[17px] font-semibold text-[#FFFFFF] mb-4">Analysis Summary</h4>
                  <div className="bg-[#2C2C2E] rounded-xl p-4 border border-[#38383A]/30 space-y-3">
                    {selectedProduct.analysisData.brandEssence && (
                      <div>
                        <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1">
                          Brand Essence
                        </label>
                        <p className="text-[15px] text-[#FFFFFF]">{selectedProduct.analysisData.brandEssence}</p>
                      </div>
                    )}
                    {selectedProduct.analysisData.targetAudience && (
                      <div>
                        <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1">
                          Target Audience
                        </label>
                        <p className="text-[15px] text-[#FFFFFF]">{selectedProduct.analysisData.targetAudience}</p>
                      </div>
                    )}
                    {selectedProduct.analysisData.usp && (
                      <div>
                        <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1">
                          Unique Selling Proposition
                        </label>
                        <p className="text-[15px] text-[#FFFFFF]">{selectedProduct.analysisData.usp}</p>
                      </div>
                    )}
                    {selectedProduct.analysisData.voiceAdjectives && (
                      <div>
                        <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1">
                          Voice Adjectives
                        </label>
                        <p className="text-[15px] text-[#FFFFFF]">{selectedProduct.analysisData.voiceAdjectives}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedProduct.status !== 'completed' && (
                <div className="text-center py-8">
                  <p className="text-[15px] text-[#8E8E93]">
                    {selectedProduct.status === 'analyzing' || selectedProduct.status === 'pending'
                      ? 'Analysis in progress...'
                      : 'Analysis failed or not yet completed'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

