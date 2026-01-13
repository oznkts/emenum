import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Giris Yap',
}

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary-50 px-4 py-8 dark:bg-secondary-900">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-2xl font-bold text-primary-600 dark:text-primary-400"
      >
        <svg
          className="h-8 w-8"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="32" height="32" rx="8" className="fill-primary-600" />
          <path
            d="M8 12h16M8 16h16M8 20h12"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span>ozaMenu</span>
      </Link>

      {/* Auth Card Container */}
      <div className="w-full max-w-md">{children}</div>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-secondary-500 dark:text-secondary-400">
        <p>
          &copy; {new Date().getFullYear()} ozaMenu. Tum haklar saklidir.
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <Link
            href="/features"
            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Ozellikler
          </Link>
          <Link
            href="/pricing"
            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Fiyatlandirma
          </Link>
        </div>
      </footer>
    </div>
  )
}
