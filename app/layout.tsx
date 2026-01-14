import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Force dynamic rendering to prevent static generation issues with client components
export const dynamic = 'force-dynamic'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'ozaMenu - Dijital QR Menu ve Fiyat Defteri',
    template: '%s | ozaMenu',
  },
  description:
    'Türkiye\'deki restoran, kafe ve benzeri işletmeler için Ticaret Bakanlığı regülasyonlarına uyumlu Dijital Fiyat Defteri ve QR Menu SaaS platformu.',
  keywords: [
    'QR menu',
    'dijital menü',
    'restoran menü',
    'kafe menü',
    'fiyat defteri',
    'dijital fiyat defteri',
  ],
  authors: [{ name: 'ozaMenu' }],
  creator: 'ozaMenu',
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'ozaMenu',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  )
}
