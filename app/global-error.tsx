'use client'

/**
 * Global error boundary component
 *
 * This component catches errors in the root layout and renders
 * a full page error UI. It must include <html> and <body> tags
 * since it replaces the entire page when an error occurs in the root layout.
 */
export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
        <div className="flex min-h-screen flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-red-600">500</h1>
            <h2 className="mt-4 text-2xl font-semibold text-secondary-900 dark:text-secondary-100">
              Sunucu Hatasi
            </h2>
            <p className="mt-2 text-secondary-600 dark:text-secondary-400">
              Beklenmeyen bir hata olustu. Lutfen daha sonra tekrar deneyin.
            </p>
            <button
              onClick={reset}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
