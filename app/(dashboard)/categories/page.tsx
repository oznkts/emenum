'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Category } from '@/types/database'

/**
 * Generate a URL-safe slug from a string (Turkish character support)
 */
function generateSlug(text: string): string {
  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U',
  }

  return text
    .toLowerCase()
    .split('')
    .map(char => turkishMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Category tree node component for displaying hierarchical categories
 */
function CategoryTreeNode({
  category,
  categories,
  level = 0,
  onEdit,
  onDelete,
  onToggleVisibility,
}: {
  category: Category
  categories: Category[]
  level?: number
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onToggleVisibility: (category: Category) => void
}) {
  const children = categories
    .filter(c => c.parent_id === category.id)
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className={level > 0 ? 'ml-6 border-l border-secondary-200 dark:border-secondary-700' : ''}>
      <div
        className={`
          group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors
          hover:bg-secondary-50 dark:hover:bg-secondary-800/50
          ${!category.is_visible ? 'opacity-60' : ''}
        `.trim().replace(/\s+/g, ' ')}
      >
        {/* Visibility indicator */}
        <button
          type="button"
          onClick={() => onToggleVisibility(category)}
          className="shrink-0 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
          aria-label={category.is_visible ? 'Gizle' : 'Goster'}
          title={category.is_visible ? 'Gizle' : 'Goster'}
        >
          {category.is_visible ? (
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

        {/* Category name */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-secondary-900 dark:text-secondary-100 truncate">
            {category.name}
          </p>
          <p className="text-xs text-secondary-500 dark:text-secondary-400">
            /{category.slug}
          </p>
        </div>

        {/* Sort order badge */}
        <span className="shrink-0 rounded bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400">
          #{category.sort_order}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="rounded p-1 text-secondary-500 hover:bg-secondary-200 hover:text-secondary-700 dark:hover:bg-secondary-700 dark:hover:text-secondary-300"
            aria-label="Duzenle"
            title="Duzenle"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(category)}
            className="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30"
            aria-label="Sil"
            title="Sil"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="mt-1">
          {children.map(child => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              categories={categories}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleVisibility={onToggleVisibility}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const { organization } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parent_id: '',
    sort_order: 0,
    is_visible: true,
  })
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Fetch categories from the database
   */
  const fetchCategories = useCallback(async () => {
    if (!organization?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('sort_order', { ascending: true })

      if (fetchError) throw fetchError
      setCategories(data || [])
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
   * Open modal for adding a new category
   */
  const handleAddCategory = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      parent_id: '',
      sort_order: categories.length,
      is_visible: true,
    })
    setFormError(null)
    setIsModalOpen(true)
  }

  /**
   * Open modal for editing a category
   */
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id || '',
      sort_order: category.sort_order,
      is_visible: category.is_visible,
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
      const slug = formData.slug || generateSlug(formData.name)

      const categoryData = {
        name: formData.name.trim(),
        slug,
        parent_id: formData.parent_id || null,
        sort_order: formData.sort_order,
        is_visible: formData.is_visible,
        organization_id: organization.id,
      }

      if (editingCategory) {
        // Update existing category
        const { error: updateError } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id)

        if (updateError) throw updateError
      } else {
        // Create new category
        const { error: insertError } = await supabase
          .from('categories')
          .insert(categoryData)

        if (insertError) throw insertError
      }

      setIsModalOpen(false)
      await fetchCategories()
    } catch {
      setFormError('Kategori kaydedilirken bir hata olustu.')
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Toggle category visibility
   */
  const handleToggleVisibility = async (category: Category) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('categories')
        .update({ is_visible: !category.is_visible })
        .eq('id', category.id)

      if (updateError) throw updateError
      await fetchCategories()
    } catch {
      setError('Kategori guncellenirken bir hata olustu.')
    }
  }

  /**
   * Delete a category
   */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)

    try {
      const supabase = createClient()

      // Check if category has children
      const hasChildren = categories.some(c => c.parent_id === deleteTarget.id)
      if (hasChildren) {
        setError('Bu kategori alt kategorilere sahip. Önce alt kategorileri silin.')
        setDeleteTarget(null)
        return
      }

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteTarget.id)

      if (deleteError) throw deleteError

      setDeleteTarget(null)
      await fetchCategories()
    } catch {
      setError('Kategori silinirken bir hata olustu.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Get root categories (no parent)
  const rootCategories = categories
    .filter(c => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  // Filter out current category and its descendants for parent selection
  const getAvailableParents = () => {
    if (!editingCategory) return categories

    const getDescendantIds = (parentId: string): string[] => {
      const children = categories.filter(c => c.parent_id === parentId)
      return [
        parentId,
        ...children.flatMap(c => getDescendantIds(c.id)),
      ]
    }

    const excludeIds = new Set(getDescendantIds(editingCategory.id))
    return categories.filter(c => !excludeIds.has(c.id))
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            Kategoriler
          </h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Menu kategorilerinizi yonetin ve duzenleyin
          </p>
        </div>
        <Button onClick={handleAddCategory} leftIcon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        }>
          Yeni Kategori
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

      {/* Categories list */}
      <Card>
        <CardHeader
          title="Kategori Listesi"
          subtitle={`Toplam ${categories.length} kategori`}
        />
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-secondary-100">
                Henuz kategori yok
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                Ilk kategorinizi olusturarak baslayin.
              </p>
              <div className="mt-6">
                <Button onClick={handleAddCategory} size="sm">
                  Yeni Kategori
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-secondary-100 dark:divide-secondary-700/50">
              {rootCategories.map(category => (
                <CategoryTreeNode
                  key={category.id}
                  category={category}
                  categories={categories}
                  onEdit={handleEditCategory}
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
        title={editingCategory ? 'Kategori Duzenle' : 'Yeni Kategori'}
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
              label="Kategori Adi"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({
                  ...prev,
                  name: e.target.value,
                  slug: prev.slug || generateSlug(e.target.value),
                }))
              }}
              placeholder="Ornegin: Ana Yemekler"
              required
              disabled={isSaving}
            />

            <Input
              label="URL Slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="ornegin: ana-yemekler"
              helperText="Bos birakirsaniz otomatik olusturulur"
              disabled={isSaving}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Ust Kategori
              </label>
              <select
                value={formData.parent_id}
                onChange={(e) => setFormData(prev => ({ ...prev, parent_id: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-secondary-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100"
                disabled={isSaving}
              >
                <option value="">Ana kategori (ust kategori yok)</option>
                {getAvailableParents().map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Siralama"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              min={0}
              helperText="Kucuk sayi once gosterilir"
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
              {editingCategory ? 'Guncelle' : 'Olustur'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Kategori Sil"
      >
        <div className="space-y-4">
          <p className="text-secondary-600 dark:text-secondary-400">
            <span className="font-medium text-secondary-900 dark:text-secondary-100">
              {deleteTarget?.name}
            </span>{' '}
            kategorisini silmek istediginize emin misiniz? Bu islem geri alinamaz.
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
