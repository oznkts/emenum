'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Product, Category, CurrentPrice } from '@/types/database'

/**
 * Extended product type with current price
 */
interface ProductWithPrice extends Product {
  current_price?: CurrentPrice | null
}

/**
 * Product Edit Page
 *
 * Dedicated page for editing existing products with price management.
 * Uses the immutable price ledger pattern - price changes create new entries.
 */
export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { organization } = useAuth()
  const [productId, setProductId] = useState<string | null>(null)
  const [product, setProduct] = useState<ProductWithPrice | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    price: '',
    allergens: '',
    is_visible: true,
    image_url: '',
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Resolve params promise
  useEffect(() => {
    params.then((resolved) => {
      setProductId(resolved.id)
    })
  }, [params])

  /**
   * Fetch product and categories data
   */
  const fetchData = useCallback(async () => {
    if (!organization?.id || !productId) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('organization_id', organization.id)
        .single()

      if (productError) {
        if (productError.code === 'PGRST116') {
          setError('Urun bulunamadi.')
          setIsLoading(false)
          return
        }
        throw productError
      }

      // Fetch current price
      const { data: priceData } = await supabase
        .from('current_prices')
        .select('*')
        .eq('product_id', productId)
        .single()

      const productWithPrice: ProductWithPrice = {
        ...productData,
        current_price: priceData || null,
      }

      setProduct(productWithPrice)

      // Initialize form with product data
      setFormData({
        name: productData.name || '',
        description: productData.description || '',
        category_id: productData.category_id || '',
        price: priceData?.price?.toString() || '',
        allergens: productData.allergens?.join(', ') || '',
        is_visible: productData.is_visible ?? true,
        image_url: productData.image_url || '',
      })

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })

      if (categoriesError) throw categoriesError

      setCategories(categoriesData || [])
    } catch {
      setError('Urun bilgileri yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id, productId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!organization?.id || !productId) return

    // Validate required fields
    if (!formData.name.trim()) {
      setFormError('Urun adi gereklidir.')
      return
    }

    setFormError(null)
    setIsSaving(true)

    try {
      const supabase = createClient()

      // Parse allergens from comma-separated string
      const allergens = formData.allergens
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0)

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: formData.category_id || null,
        allergens: allergens.length > 0 ? allergens : null,
        is_visible: formData.is_visible,
        image_url: formData.image_url.trim() || null,
      }

      // Update product
      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId)
        .eq('organization_id', organization.id)

      if (updateError) throw updateError

      // Handle price change (INSERT into price_ledger - immutable)
      const newPrice = parseFloat(formData.price)
      const currentPrice = product?.current_price?.price

      if (!isNaN(newPrice) && newPrice >= 0) {
        // Only add price entry if price changed
        if (currentPrice !== newPrice) {
          const { error: priceError } = await supabase.from('price_ledger').insert({
            product_id: productId,
            price: newPrice,
            currency: 'TRY',
            change_reason: currentPrice !== undefined ? 'Fiyat guncellendi' : 'Ilk fiyat',
          })

          if (priceError) throw priceError
        }
      }

      // Redirect to products list on success
      router.push('/products')
    } catch {
      setFormError('Urun kaydedilirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Handle product deletion
   */
  const handleDelete = async () => {
    if (!organization?.id || !productId) return

    setIsDeleting(true)

    try {
      const supabase = createClient()

      // Note: price_ledger entries are preserved for audit trail
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('organization_id', organization.id)

      if (deleteError) throw deleteError

      // Redirect to products list on success
      router.push('/products')
    } catch {
      setFormError('Urun silinirken bir hata olustu.')
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * Handle input changes
   */
  const handleChange = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear form error when user starts typing
    if (formError) setFormError(null)
  }

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number, currency: string = 'TRY'): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="rounded-lg p-2 text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700"
          aria-label="Geri don"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Urun Duzenle
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Urun bilgilerini guncelleyin
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          role="alert"
        >
          {error}
          <Link
            href="/products"
            className="ml-2 font-medium underline hover:no-underline"
          >
            Urunlere don
          </Link>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product form */}
      {!isLoading && product && (
        <>
          <Card>
            <CardHeader
              title="Urun Bilgileri"
              subtitle="Urun detaylarini duzenleyin"
            />
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {formError && (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                    role="alert"
                  >
                    {formError}
                  </div>
                )}

                {/* Product name */}
                <Input
                  label="Urun Adi"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ornegin: Izgara Kofte"
                  required
                  disabled={isSaving}
                  autoFocus
                />

                {/* Description */}
                <Textarea
                  label="Aciklama"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Urun aciklamasi (opsiyonel)"
                  rows={3}
                  disabled={isSaving}
                />

                {/* Category selection */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                    Kategori
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleChange('category_id', e.target.value)}
                    className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
                    disabled={isSaving}
                  >
                    <option value="">Kategori sec (opsiyonel)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="mt-1.5 text-xs text-secondary-500 dark:text-secondary-400">
                      Henuz kategori yok.{' '}
                      <Link
                        href="/categories"
                        className="text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Kategori olusturun
                      </Link>
                    </p>
                  )}
                </div>

                {/* Price input - key feature */}
                <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800/50 dark:bg-primary-900/20">
                  <Input
                    label="Fiyat (TRY)"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    helperText="Fiyat degisiklikleri Ticaret Bakanligi mevzuatina uygun sekilde kayit altina alinir"
                    disabled={isSaving}
                  />
                  {product.current_price && (
                    <p className="mt-2 text-xs text-secondary-600 dark:text-secondary-400">
                      Mevcut fiyat:{' '}
                      <span className="font-medium">
                        {formatCurrency(product.current_price.price, product.current_price.currency)}
                      </span>
                    </p>
                  )}
                </div>

                {/* Allergens */}
                <Input
                  label="Alerjenler"
                  value={formData.allergens}
                  onChange={(e) => handleChange('allergens', e.target.value)}
                  placeholder="Gluten, Sut, Fistik (virgul ile ayirin)"
                  helperText="Birden fazla alerjen icin virgul kullanin"
                  disabled={isSaving}
                />

                {/* Image URL */}
                <Input
                  label="Gorsel URL"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  helperText="Urun gorseli icin URL adresi (opsiyonel)"
                  disabled={isSaving}
                />

                {/* Image preview */}
                {formData.image_url && (
                  <div className="overflow-hidden rounded-lg border border-secondary-200 dark:border-secondary-700">
                    <img
                      src={formData.image_url}
                      alt="Urun gorseli onizleme"
                      className="h-40 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}

                {/* Visibility toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_visible"
                    checked={formData.is_visible}
                    onChange={(e) => handleChange('is_visible', e.target.checked)}
                    className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    disabled={isSaving}
                  />
                  <label
                    htmlFor="is_visible"
                    className="text-sm text-secondary-700 dark:text-secondary-300"
                  >
                    Menude goster
                  </label>
                </div>

                {/* Form actions */}
                <div className="flex items-center justify-between border-t border-secondary-200 pt-6 dark:border-secondary-700">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving || isDeleting}
                  >
                    Urunu Sil
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => router.push('/products')}
                      disabled={isSaving}
                    >
                      Iptal
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isSaving}
                      leftIcon={
                        !isSaving ? (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : undefined
                      }
                    >
                      Degisiklikleri Kaydet
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Help text */}
          <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4 dark:border-secondary-700 dark:bg-secondary-800/50">
            <h3 className="flex items-center gap-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
              <svg
                className="h-4 w-4 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Fiyat Gecmisi Hakkinda
            </h3>
            <p className="mt-1 text-xs text-secondary-600 dark:text-secondary-400">
              Tum fiyat degisiklikleri kayit altinda tutulur. Fiyati guncellediginizde
              eski fiyat silinmez, yeni bir kayit olusturulur. Bu, Turkiye Ticaret
              Bakanligi mevzuatina uygunluk icin zorunludur.
            </p>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-secondary-800">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
              Urunu Sil
            </h3>
            <p className="mt-2 text-sm text-secondary-600 dark:text-secondary-400">
              <span className="font-medium text-secondary-900 dark:text-secondary-100">
                {product?.name}
              </span>{' '}
              urununu silmek istediginize emin misiniz? Bu islem geri alinamaz.
            </p>
            <p className="mt-2 text-xs text-secondary-500 dark:text-secondary-400">
              Not: Fiyat gecmisi kayitlari denetim amacli saklanmaya devam edecektir.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Iptal
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
