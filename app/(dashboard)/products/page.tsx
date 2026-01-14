'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import Image from 'next/image'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Product, Category, CurrentPrice } from '@/types/database'

/**
 * Extended product type with current price and category info
 */
interface ProductWithDetails extends Product {
  current_price?: CurrentPrice | null
  category?: Category | null
}

/**
 * Format currency for display (Turkish Lira)
 */
function formatCurrency(amount: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Product list item component
 */
function ProductListItem({
  product,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  product: ProductWithDetails
  onEdit: (product: ProductWithDetails) => void
  onDelete: (product: ProductWithDetails) => void
  onToggleVisibility: (product: ProductWithDetails) => void
}) {
  return (
    <div
      className={`
        group flex items-center gap-4 rounded-lg px-4 py-3 transition-colors
        hover:bg-secondary-50 dark:hover:bg-secondary-800/50
        ${!product.is_visible ? 'opacity-60' : ''}
      `.trim().replace(/\s+/g, ' ')}
    >
      {/* Product image or placeholder */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary-100 dark:bg-secondary-700">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={56}
            height={56}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-6 w-6 text-secondary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Visibility toggle */}
      <button
        type="button"
        onClick={() => onToggleVisibility(product)}
        className="shrink-0 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
        aria-label={product.is_visible ? 'Gizle' : 'Goster'}
        title={product.is_visible ? 'Gizle' : 'Goster'}
      >
        {product.is_visible ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        )}
      </button>

      {/* Product info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-secondary-900 dark:text-secondary-100 truncate">
            {product.name}
          </p>
          {product.allergens && product.allergens.length > 0 && (
            <span
              className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              title={`Alerjenler: ${product.allergens.join(', ')}`}
            >
              Alerjen
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
          {product.category && (
            <span className="truncate">{product.category.name}</span>
          )}
          {product.description && (
            <>
              <span>•</span>
              <span className="truncate">{product.description}</span>
            </>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="shrink-0 text-right">
        {product.current_price ? (
          <p className="font-semibold text-secondary-900 dark:text-secondary-100">
            {formatCurrency(product.current_price.price, product.current_price.currency)}
          </p>
        ) : (
          <p className="text-sm italic text-secondary-400">Fiyat yok</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="rounded p-1.5 text-secondary-500 hover:bg-secondary-200 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
          aria-label="Duzenle"
          title="Duzenle"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDelete(product)}
          className="rounded p-1.5 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30"
          aria-label="Sil"
          title="Sil"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const { organization } = useAuth()
  const [products, setProducts] = useState<ProductWithDetails[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    allergens: '',
    is_visible: true,
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ProductWithDetails | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Fetch products and their prices from the database
   */
  const fetchProducts = useCallback(async () => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      // Fetch current prices
      const productIds = productsData?.map(p => p.id) || []
      let pricesMap: Record<string, CurrentPrice> = {}

      if (productIds.length > 0) {
        const { data: pricesData, error: pricesError } = await supabase
          .from('current_prices')
          .select('*')
          .in('product_id', productIds)

        if (pricesError) throw pricesError

        pricesMap = (pricesData || []).reduce((acc, price) => {
          acc[price.product_id] = price
          return acc
        }, {} as Record<string, CurrentPrice>)
      }

      // Fetch categories for reference
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organization.id)

      if (categoriesError) throw categoriesError

      const categoriesMap: Record<string, Category> = (categoriesData || []).reduce((acc, cat) => {
        acc[cat.id] = cat
        return acc
      }, {} as Record<string, Category>)

      setCategories(categoriesData || [])

      // Combine products with prices and categories
      const productsWithDetails: ProductWithDetails[] = (productsData || []).map(product => ({
        ...product,
        current_price: pricesMap[product.id] || null,
        category: product.category_id ? categoriesMap[product.category_id] : null,
      }))

      setProducts(productsWithDetails)
    } catch {
      setError('Urunler yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  /**
   * Open modal for adding a new product
   */
  const handleAddProduct = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      category_id: '',
      price: '',
      allergens: '',
      is_visible: true,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  /**
   * Open modal for editing a product
   */
  const handleEditProduct = (product: ProductWithDetails) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      price: product.current_price ? product.current_price.price.toString() : '',
      allergens: product.allergens?.join(', ') || '',
      is_visible: product.is_visible,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  /**
   * Handle form submission for add/edit
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!organization?.id) return

    setFormError(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Parse allergens from comma-separated string
      const allergens = formData.allergens
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0)

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: formData.category_id || null,
        allergens: allergens.length > 0 ? allergens : null,
        is_visible: formData.is_visible,
        organization_id: organization.id,
      }

      let productId: string

      if (editingProduct) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        if (updateError) throw updateError
        productId = editingProduct.id
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single()

        if (insertError) throw insertError
        productId = newProduct.id
      }

      // Handle price change (INSERT into price_ledger - immutable)
      const newPrice = parseFloat(formData.price)
      const currentPrice = editingProduct?.current_price?.price

      if (!isNaN(newPrice) && newPrice >= 0) {
        // Only add price entry if it's a new product or price changed
        if (!editingProduct || currentPrice !== newPrice) {
          const { error: priceError } = await supabase
            .from('price_ledger')
            .insert({
              product_id: productId,
              price: newPrice,
              currency: 'TRY',
              change_reason: editingProduct ? 'Fiyat guncellendi' : 'Ilk fiyat',
            })

          if (priceError) throw priceError
        }
      }

      setIsModalOpen(false)
      await fetchProducts()
    } catch {
      setFormError('Urun kaydedilirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Toggle product visibility
   */
  const handleToggleVisibility = async (product: ProductWithDetails) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_visible: !product.is_visible })
        .eq('id', product.id)

      if (updateError) throw updateError
      await fetchProducts()
    } catch {
      setError('Urun guncellenirken bir hata olustu.')
    }
  }

  /**
   * Delete a product
   */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)

    try {
      const supabase = createClient()

      // Note: price_ledger entries are preserved for audit trail
      // The product will be soft-deleted or the price entries will remain orphaned
      // depending on FK constraints and business requirements
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteTarget.id)

      if (deleteError) throw deleteError

      setDeleteTarget(null)
      await fetchProducts()
    } catch {
      setError('Urun silinirken bir hata olustu.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter products based on search query and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = !filterCategory || product.category_id === filterCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Urunler
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Menu urunlerinizi yonetin ve fiyatlandirin
          </p>
        </div>
        <Button onClick={handleAddProduct} leftIcon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        }>
          Yeni Urun
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          role="alert"
        >
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Urun ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 bg-white py-2 pl-10 pr-4 text-secondary-900 transition-colors placeholder:text-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100 dark:placeholder:text-secondary-500"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
              >
                <option value="">Tum Kategoriler</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products list */}
      <Card>
        <CardHeader
          title="Urun Listesi"
          subtitle={`${filteredProducts.length} urun ${searchQuery || filterCategory ? '(filtrelenmis)' : ''}`}
        />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                {searchQuery || filterCategory ? 'Sonuc bulunamadi' : 'Henuz urun yok'}
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                {searchQuery || filterCategory
                  ? 'Farkli bir arama veya filtre deneyin.'
                  : 'Ilk urunlerinizi olusturarak baslayin.'}
              </p>
              {!searchQuery && !filterCategory && (
                <div className="mt-6">
                  <Button onClick={handleAddProduct} size="sm">
                    Yeni Urun
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {filteredProducts.map(product => (
                <ProductListItem
                  key={product.id}
                  product={product}
                  onEdit={handleEditProduct}
                  onDelete={setDeleteTarget}
                  onToggleVisibility={handleToggleVisibility}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Urun Duzenle' : 'Yeni Urun'}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {formError && (
              <div
                className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                role="alert"
              >
                {formError}
              </div>
            )}

            <Input
              label="Urun Adi"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ornegin: Izgara Kofte"
              required
              disabled={isSaving}
            />

            <Textarea
              label="Aciklama"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Urun aciklamasi (opsiyonel)"
              rows={2}
              disabled={isSaving}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Kategori
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
                disabled={isSaving}
              >
                <option value="">Kategori sec (opsiyonel)</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Fiyat (TRY)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              min={0}
              step={0.01}
              helperText="Fiyat degisiklikleri kayit altina alinir"
              disabled={isSaving}
            />

            <Input
              label="Alerjenler"
              value={formData.allergens}
              onChange={(e) => setFormData(prev => ({ ...prev, allergens: e.target.value }))}
              placeholder="Gluten, Sut, Fistik (virgul ile ayirin)"
              helperText="Birden fazla alerjen icin virgul kullanin"
              disabled={isSaving}
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_visible"
                checked={formData.is_visible}
                onChange={(e) => setFormData(prev => ({ ...prev, is_visible: e.target.checked }))}
                className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                disabled={isSaving}
              />
              <label htmlFor="is_visible" className="text-sm text-secondary-700 dark:text-secondary-300">
                Menude goster
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Iptal
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingProduct ? 'Guncelle' : 'Olustur'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Urun Sil"
      >
        <div className="space-y-4">
          <p className="text-secondary-600 dark:text-secondary-400">
            <span className="font-medium text-secondary-900 dark:text-secondary-100">
              {deleteTarget?.name}
            </span>{' '}
            urununu silmek istediginize emin misiniz? Bu islem geri alinamaz.
          </p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Not: Fiyat gecmisi kayitlari denetim amacli saklanmaya devam edecektir.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Iptal
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
