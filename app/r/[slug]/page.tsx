/**
 * Restaurant Landing Page
 *
 * Public landing page for a restaurant showing branding, info,
 * and a prominent call-to-action to view the menu.
 *
 * This is an optional entry point - customers can also go directly to /menu/[slug].
 * Use this page for marketing purposes or when you want to show more
 * information about the restaurant before the menu.
 *
 * ISR Configuration:
 * - Pages are statically generated at build time via generateStaticParams
 * - Pages are revalidated every 60 seconds (or on-demand via revalidatePath)
 * - Non-existent slugs show 404 page
 *
 * @route GET /r/[slug]
 */

import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * ISR revalidation interval in seconds
 * Pages will be regenerated at most once every 60 seconds
 */
export const revalidate = 60

interface RestaurantPageProps {
  params: Promise<{ slug: string }>
}

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cover_url: string | null
  settings: Record<string, unknown>
  is_active: boolean
}

/**
 * Generate static params for all active organizations
 * This pre-generates restaurant pages at build time for performance
 */
export async function generateStaticParams() {
  const supabase = await createServerSupabaseClient()

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
 * Fetch organization data by slug
 */
async function getOrganizationBySlug(
  slug: string
): Promise<Organization | null> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, cover_url, settings, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as Organization
}

/**
 * Generate dynamic metadata for SEO
 */
export async function generateMetadata({
  params,
}: RestaurantPageProps): Promise<Metadata> {
  const { slug } = await params
  const organization = await getOrganizationBySlug(slug)

  if (!organization) {
    return {
      title: 'Restoran Bulunamadi | ozaMenu',
      description: 'Istediginiz restoran bulunamadi.',
    }
  }

  return {
    title: `${organization.name} | ozaMenu`,
    description: `${organization.name} dijital menu - QR kod ile kolayca erisim`,
    openGraph: {
      title: organization.name,
      description: `${organization.name} dijital menusunu goruntuleyin`,
      images: organization.cover_url ? [organization.cover_url] : undefined,
    },
  }
}

/**
 * Restaurant Landing Page Component
 *
 * Displays restaurant branding and a call-to-action to view the menu.
 */
export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { slug } = await params
  const organization = await getOrganizationBySlug(slug)

  // Handle not found case
  if (!organization) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-secondary-50">
      {/* Hero Section with Cover Image */}
      <section className="relative">
        {organization.cover_url ? (
          <div className="relative h-64 w-full overflow-hidden sm:h-80 md:h-96">
            <Image
              src={organization.cover_url}
              alt={`${organization.name} kapak gorseli`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-64 w-full bg-gradient-to-br from-primary-500 to-primary-700 sm:h-80 md:h-96" />
        )}

        {/* Restaurant Logo and Name */}
        <div className="absolute inset-x-0 bottom-0 transform translate-y-1/2 px-4">
          <div className="mx-auto max-w-xl">
            <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-lg sm:flex-row sm:items-end sm:gap-6 sm:p-8">
              {/* Logo */}
              {organization.logo_url ? (
                <div className="relative -mt-16 h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md sm:-mt-20 sm:h-32 sm:w-32">
                  <Image
                    src={organization.logo_url}
                    alt={`${organization.name} logo`}
                    fill
                    sizes="(max-width: 640px) 96px, 128px"
                    className="object-cover"
                    priority
                  />
                </div>
              ) : (
                <div className="-mt-16 flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-4 border-white bg-primary-100 shadow-md sm:-mt-20 sm:h-32 sm:w-32">
                  <span className="text-3xl font-bold text-primary-600 sm:text-4xl">
                    {organization.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Restaurant Name */}
              <div className="mt-4 text-center sm:mt-0 sm:text-left">
                <h1 className="text-2xl font-bold text-secondary-900 sm:text-3xl md:text-4xl">
                  {organization.name}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-xl px-4 pt-32 pb-12 sm:pt-36">
        {/* Call to Action */}
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-secondary-800 sm:text-2xl">
              Dijital Menumuzu Kesfet
            </h2>
            <p className="mt-2 text-secondary-500">
              Tum urunlerimizi ve guncel fiyatlarimizi goruntulemek icin asagidaki butona tiklayin.
            </p>

            {/* View Menu Button */}
            <Link
              href={`/menu/${organization.slug}`}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-all hover:bg-primary-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
              Menuyu Goruntule
            </Link>
          </div>
        </div>

        {/* Features/Info Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6 text-primary-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-secondary-900">QR Kod ile Erisim</h3>
              <p className="text-sm text-secondary-500">Hizli ve temassiz menu erisimi</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-success-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6 text-success-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-secondary-900">Guncel Fiyatlar</h3>
              <p className="text-sm text-secondary-500">Her zaman dogru fiyat bilgisi</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-warning-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6 text-warning-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-secondary-900">Alerjen Bilgisi</h3>
              <p className="text-sm text-secondary-500">Detayli icerik bilgileri</p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-info-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6 text-info-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-secondary-900">Mobil Uyumlu</h3>
              <p className="text-sm text-secondary-500">Her cihazda mukemmel gorunum</p>
            </div>
          </div>
        </div>
      </section>

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
      </footer>
    </main>
  )
}
