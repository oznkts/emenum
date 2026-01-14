/**
 * Public Menu Page with ISR (Incremental Static Regeneration)
 *
 * This is the primary QR code target page - the core function of the platform.
 * Customer scans QR code and accesses this menu page.
 *
 * ISR Configuration:
 * - Pages are statically generated at build time via generateStaticParams
 * - Pages are revalidated every 60 seconds (or on-demand via revalidatePath)
 * - Non-existent slugs show 404 page
 *
 * @route GET /menu/[slug]
 */

import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createStaticSupabaseClient } from '@/lib/supabase/server'
import {
  getCurrentMenuSnapshotBySlug,
  type MenuSnapshotData,
} from '@/lib/services/snapshot'

/**
 * ISR revalidation interval in seconds
 * Pages will be regenerated at most once every 60 seconds
 */
export const revalidate = 60

interface MenuPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Generate static params for all active organizations
 * This pre-generates menu pages at build time for performance
 * Uses static client because generateStaticParams runs outside request context
 */
export async function generateStaticParams() {
  const supabase = createStaticSupabaseClient()

  // Return empty array if Supabase is not configured (during build without env vars)
  if (!supabase) {
    return []
  }

  const { data: organizations } = await supabase
    .from('organizations')
    .select('slug')
    .eq('is_active', true)

  return (
    organizations?.map((org) => ({
      slug: org.slug,
    })) || []
  )
}

/**
 * Generate dynamic metadata for SEO
 */
export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const { slug } = await params

  const result = await getCurrentMenuSnapshotBySlug(slug)

  if (!result.success || !result.data) {
    return {
      title: 'Menu Bulunamadı | ozaMenu',
      description: 'İstediğiniz menu bulunamadı.',
    }
  }

  const menuData = result.data.snapshot_data as unknown as MenuSnapshotData
  const orgName = menuData.organization.name

  return {
    title: `${orgName} Menu | ozaMenu`,
    description: `${orgName} dijital menu - ${menuData.metadata.product_count} ürün, ${menuData.metadata.category_count} kategori`,
    openGraph: {
      title: `${orgName} Menu`,
      description: `${orgName} dijital menusunu görüntüleyin`,
      images: menuData.organization.cover_url
        ? [menuData.organization.cover_url]
        : undefined,
    },
  }
}

/**
 * Public Menu Page Component
 *
 * Displays the restaurant menu from the latest published snapshot.
 * Uses ISR for optimal performance with fresh data.
 */
export default async function MenuPage({ params }: MenuPageProps) {
  const { slug } = await params

  // Get the latest published menu snapshot
  const result = await getCurrentMenuSnapshotBySlug(slug)

  // Handle not found case
  if (!result.success || !result.data) {
    notFound()
  }

  const menuData = result.data.snapshot_data as unknown as MenuSnapshotData
  const { organization, categories, products } = menuData

  // Group products by category
  const productsByCategory = new Map<string | null, typeof products>()

  // Initialize with empty arrays for each category
  categories.forEach((cat) => {
    productsByCategory.set(cat.id, [])
  })
  productsByCategory.set(null, []) // For uncategorized products

  // Populate products into categories
  products.forEach((product) => {
    const categoryId = product.category_id
    const existing = productsByCategory.get(categoryId) || []
    productsByCategory.set(categoryId, [...existing, product])
  })

  // Sort categories by sort_order
  const sortedCategories = [...categories].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  return (
    <main className="min-h-screen bg-secondary-50">
      {/* Header with organization info */}
      <header className="relative">
        {/* Cover Image */}
        {organization.cover_url && (
          <div className="relative h-48 w-full overflow-hidden sm:h-64">
            <Image
              src={organization.cover_url}
              alt={`${organization.name} kapak görseli`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Organization Info */}
        <div
          className={`bg-white px-4 py-6 shadow-sm ${
            organization.cover_url ? '-mt-12 relative mx-4 rounded-lg sm:mx-auto sm:max-w-2xl' : ''
          }`}
        >
          <div className="flex items-center gap-4">
            {/* Logo */}
            {organization.logo_url && (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-secondary-200 sm:h-20 sm:w-20">
                <Image
                  src={organization.logo_url}
                  alt={`${organization.name} logo`}
                  fill
                  sizes="(max-width: 640px) 64px, 80px"
                  className="object-cover"
                />
              </div>
            )}

            {/* Name */}
            <div>
              <h1 className="text-2xl font-bold text-secondary-900 sm:text-3xl">
                {organization.name}
              </h1>
              <p className="mt-1 text-sm text-secondary-500">
                {menuData.metadata.product_count} ürün
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Menu Content */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Categories */}
        {sortedCategories.length === 0 && products.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="text-secondary-500">
              Bu menude henüz ürün bulunmuyor.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Render categories with their products */}
            {sortedCategories.map((category) => {
              const categoryProducts = productsByCategory.get(category.id) || []

              if (categoryProducts.length === 0) return null

              return (
                <section key={category.id} className="space-y-4">
                  {/* Category Header */}
                  <h2 className="border-b-2 border-primary-500 pb-2 text-xl font-semibold text-secondary-900">
                    {category.name}
                  </h2>

                  {/* Products in this category */}
                  <div className="space-y-3">
                    {categoryProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )
            })}

            {/* Uncategorized products */}
            {(() => {
              const uncategorized = productsByCategory.get(null) || []
              if (uncategorized.length === 0) return null

              return (
                <section className="space-y-4">
                  <h2 className="border-b-2 border-secondary-300 pb-2 text-xl font-semibold text-secondary-900">
                    Diğer
                  </h2>
                  <div className="space-y-3">
                    {uncategorized.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )
            })()}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto bg-white py-6 text-center shadow-inner">
        <p className="text-sm text-secondary-400">
          Powered by{' '}
          <Link
            href="/"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            ozaMenu
          </Link>
        </p>
        <p className="mt-1 text-xs text-secondary-300">
          Son güncelleme:{' '}
          {new Date(menuData.metadata.generated_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </footer>
    </main>
  )
}

/**
 * Product Card Component
 * Displays a single product with image, name, description, and price
 */
function ProductCard({
  product,
}: {
  product: MenuSnapshotData['products'][number]
}) {
  const hasImage = !!product.image_url
  const hasAllergens = product.allergens && product.allergens.length > 0

  return (
    <article className="flex gap-4 rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Product Image */}
      {hasImage && (
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-24">
          <Image
            src={product.image_url!}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover"
          />
        </div>
      )}

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="font-medium text-secondary-900">{product.name}</h3>
          {product.description && (
            <p className="mt-1 text-sm text-secondary-500 line-clamp-2">
              {product.description}
            </p>
          )}
          {/* Allergens */}
          {hasAllergens && (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.allergens!.map((allergen) => (
                <span
                  key={allergen}
                  className="rounded bg-warning-100 px-1.5 py-0.5 text-xs text-warning-800"
                >
                  {allergen}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mt-2 text-right">
          {product.price !== null ? (
            <span className="text-lg font-semibold text-primary-600">
              {formatPrice(product.price, product.currency)}
            </span>
          ) : (
            <span className="text-sm text-secondary-400">Fiyat yok</span>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * Format price with currency symbol
 */
function formatPrice(price: number, currency: string): string {
  const formatter = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency || 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(price)
}
