import Link from 'next/link'

/**
 * Custom 404 Not Found page
 *
 * This page is shown when a route doesn't exist.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary-50 dark:bg-secondary-900">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-secondary-900 dark:text-secondary-100">
          Sayfa Bulunamadi
        </h2>
        <p className="mt-2 text-secondary-600 dark:text-secondary-400">
          Aradiginiz sayfa mevcut degil veya tasinmis olabilir.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Ana Sayfaya Don
        </Link>
      </div>
    </div>
  )
}
