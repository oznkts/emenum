'use client'

import { useEffect } from 'react'

/**
 * Error boundary component for handling runtime errors
 *
 * This component catches errors in the component tree and displays
 * a fallback UI instead of crashing the whole app.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary-50 dark:bg-secondary-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">Hata</h1>
        <h2 className="mt-4 text-2xl font-semibold text-secondary-900 dark:text-secondary-100">
          Bir seyler yanlis gitti
        </h2>
        <p className="mt-2 text-secondary-600 dark:text-secondary-400">
          Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.
        </p>
        <button
          onClick={reset}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}
