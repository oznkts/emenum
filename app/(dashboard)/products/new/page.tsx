'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Category } from '@/types/database'

/**
 * New Product Page
 *
 * Dedicated page for creating new products with price input.
 * Uses the immutable price ledger pattern for price storage.
 */
export default function NewProductPage() {
  const router = useRouter()
  const { organization } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  /**
   * Fetch categories for the dropdown
   */
  const fetchCategories = useCallback(async () => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })

      if (categoriesError) throw categoriesError

      setCategories(categoriesData || [])
    } catch {
      setError('Kategoriler yuklenirken bir hata olustu.')
    } finally {
      setIsLoading(false)
    }
  }, [organization?.id])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!organization?.id) return

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
        organization_id: organization.id,
      }

      // Create new product
      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()

      if (insertError) throw insertError

      // Handle price entry (INSERT into price_ledger - immutable)
      const newPrice = parseFloat(formData.price)

      if (!isNaN(newPrice) && newPrice >= 0) {
        const { error: priceError } = await supabase.from('price_ledger').insert({
          product_id: newProduct.id,
          price: newPrice,
          currency: 'TRY',
          change_reason: 'Ilk fiyat',
        })

        if (priceError) throw priceError
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
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Yeni Urun
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Menuye yeni bir urun ekleyin
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
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium underline hover:no-underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Product form */}
      <Card>
        <CardHeader
          title="Urun Bilgileri"
          subtitle="Urun detaylarini doldurun"
        />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : (
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
              <div className="flex items-center justify-end gap-3 border-t border-secondary-200 pt-6 dark:border-secondary-700">
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    ) : undefined
                  }
                >
                  Urun Olustur
                </Button>
              </div>
            </form>
          )}
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
          Fiyat Kaydi Hakkinda
        </h3>
        <p className="mt-1 text-xs text-secondary-600 dark:text-secondary-400">
          Turkiye Ticaret Bakanligi mevzuatina uygun olarak, tum fiyat
          degisiklikleri degistirilemez sekilde kayit altina alinir. Her fiyat
          guncellemesi yeni bir kayit olusturur ve eski fiyatlar silinmez.
        </p>
      </div>
    </div>
  )
}
