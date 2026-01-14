import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ozaMenu - Dijital QR Menu ve Fiyat Defteri',
  description:
    'Türkiye\'deki restoran, kafe ve benzeri işletmeler için Ticaret Bakanlığı regülasyonlarına uyumlu Dijital Fiyat Defteri ve QR Menu SaaS platformu.',
  openGraph: {
    title: 'ozaMenu - Dijital QR Menu ve Fiyat Defteri',
    description: 'Ticaret Bakanlığı regülasyonlarına uyumlu Dijital Fiyat Defteri ve QR Menu platformu.',
    type: 'website',
  },
}

// Animated gradient background component
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden -z-10">
      {/* Main gradient orbs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

// QR Code icon component
function QRCodeIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  )
}

// Animated QR scanner effect
function AnimatedQRDemo() {
  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="relative mx-auto w-64 h-[520px] bg-secondary-900 rounded-[3rem] p-3 shadow-2xl shadow-primary-500/20 border border-secondary-700">
        {/* Phone notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-secondary-900 rounded-b-2xl z-20" />
        {/* Screen */}
        <div className="w-full h-full bg-white dark:bg-secondary-950 rounded-[2.25rem] overflow-hidden relative">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-8 pb-2">
            <span className="text-xs font-medium text-secondary-500">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 rounded-sm bg-secondary-400" />
              <div className="w-4 h-4 rounded-full border-2 border-secondary-400" />
            </div>
          </div>

          {/* Menu content */}
          <div className="px-4 space-y-4 animate-fadeIn">
            {/* Restaurant header */}
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-primary-500/30">
                <span className="text-2xl">🍽️</span>
              </div>
              <h3 className="font-bold text-secondary-900 dark:text-white">Cafe Istanbul</h3>
              <p className="text-xs text-secondary-500">Dijital Menu</p>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-hidden">
              <span className="px-3 py-1.5 bg-primary-500 text-white text-xs font-medium rounded-full whitespace-nowrap">Ana Yemekler</span>
              <span className="px-3 py-1.5 bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 text-xs font-medium rounded-full whitespace-nowrap">İçecekler</span>
              <span className="px-3 py-1.5 bg-secondary-100 dark:bg-secondary-800 text-secondary-400 text-xs font-medium rounded-full whitespace-nowrap">Tatlılar</span>
            </div>

            {/* Menu items */}
            <div className="space-y-3">
              <MenuItemPreview
                name="Izgara Köfte"
                price="₺189"
                emoji="🥩"
                isNew
              />
              <MenuItemPreview
                name="Tavuk Şiş"
                price="₺159"
                emoji="🍗"
              />
              <MenuItemPreview
                name="Karışık Izgara"
                price="₺249"
                emoji="🍖"
                isChefPick
              />
            </div>

            {/* Call waiter button */}
            <button className="w-full py-3 bg-primary-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30">
              <span>🛎️</span>
              Garson Çağır
            </button>
          </div>
        </div>
      </div>

      {/* Floating elements */}
      <div className="absolute -right-4 top-20 bg-white dark:bg-secondary-800 rounded-2xl shadow-xl p-4 animate-float">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <span className="text-lg">✓</span>
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-900 dark:text-white">Fiyat Güncellendi</p>
            <p className="text-xs text-secondary-500">Kayıt defterine eklendi</p>
          </div>
        </div>
      </div>

      <div className="absolute -left-8 bottom-32 bg-white dark:bg-secondary-800 rounded-2xl shadow-xl p-4 animate-float animation-delay-2000">
        <div className="flex items-center gap-3">
          <QRCodeIcon className="w-8 h-8 text-primary-500" />
          <div>
            <p className="text-sm font-medium text-secondary-900 dark:text-white">QR Hazır</p>
            <p className="text-xs text-secondary-500">Anında erişim</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Menu item preview component
function MenuItemPreview({
  name,
  price,
  emoji,
  isNew = false,
  isChefPick = false
}: {
  name: string
  price: string
  emoji: string
  isNew?: boolean
  isChefPick?: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-900/50 rounded-xl">
      <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-800 rounded-xl flex items-center justify-center text-2xl shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-secondary-900 dark:text-white text-sm truncate">{name}</h4>
          {isNew && <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-medium rounded">YENİ</span>}
          {isChefPick && <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-medium rounded">⭐ CHEF</span>}
        </div>
        <p className="text-xs text-secondary-500 mt-0.5">Lezzetli ve taze</p>
      </div>
      <span className="font-bold text-primary-600 dark:text-primary-400">{price}</span>
    </div>
  )
}

// Feature card component
function FeatureCard({
  icon,
  title,
  description,
  gradient = false
}: {
  icon: React.ReactNode
  title: string
  description: string
  gradient?: boolean
}) {
  return (
    <div className={`group relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
      gradient
        ? 'bg-gradient-to-br from-primary-500 to-primary-600 border-primary-400 text-white'
        : 'bg-white dark:bg-secondary-900 border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600'
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
        gradient
          ? 'bg-white/20'
          : 'bg-primary-50 dark:bg-primary-900/30 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50'
      } transition-colors`}>
        {icon}
      </div>
      <h3 className={`text-lg font-semibold mb-2 ${gradient ? 'text-white' : 'text-secondary-900 dark:text-white'}`}>
        {title}
      </h3>
      <p className={`text-sm leading-relaxed ${gradient ? 'text-white/80' : 'text-secondary-600 dark:text-secondary-400'}`}>
        {description}
      </p>
    </div>
  )
}

// Stats component
function StatCard({ value, label, suffix = '' }: { value: string; label: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl sm:text-5xl font-bold text-primary-600 dark:text-primary-400 mb-2">
        {value}<span className="text-2xl sm:text-3xl">{suffix}</span>
      </div>
      <p className="text-secondary-600 dark:text-secondary-400 text-sm">{label}</p>
    </div>
  )
}

// Testimonial component
function TestimonialCard({
  quote,
  author,
  role,
  avatar
}: {
  quote: string
  author: string
  role: string
  avatar: string
}) {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-2xl p-6 shadow-lg border border-secondary-100 dark:border-secondary-800">
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
      <p className="text-secondary-700 dark:text-secondary-300 mb-6 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
          {avatar}
        </div>
        <div>
          <p className="font-semibold text-secondary-900 dark:text-white">{author}</p>
          <p className="text-sm text-secondary-500">{role}</p>
        </div>
      </div>
    </div>
  )
}

// Pricing tier component
function PricingTier({
  name,
  price,
  period = '/ay',
  features,
  isPopular = false,
  ctaText = 'Başla'
}: {
  name: string
  price: string
  period?: string
  features: string[]
  isPopular?: boolean
  ctaText?: string
}) {
  return (
    <div className={`relative rounded-2xl p-6 ${
      isPopular
        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-2xl shadow-primary-500/30 scale-105'
        : 'bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
            EN POPÜLER
          </span>
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className={`text-lg font-semibold mb-2 ${isPopular ? 'text-white' : 'text-secondary-900 dark:text-white'}`}>
          {name}
        </h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-secondary-900 dark:text-white'}`}>
            {price}
          </span>
          <span className={`text-sm ${isPopular ? 'text-white/70' : 'text-secondary-500'}`}>
            {period}
          </span>
        </div>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2">
            <svg
              className={`w-5 h-5 shrink-0 ${isPopular ? 'text-white' : 'text-primary-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className={`text-sm ${isPopular ? 'text-white/90' : 'text-secondary-600 dark:text-secondary-400'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`block w-full py-3 text-center font-semibold rounded-xl transition-all duration-200 ${
          isPopular
            ? 'bg-white text-primary-600 hover:bg-secondary-50'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {ctaText}
      </Link>
    </div>
  )
}

// Navigation component
function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-secondary-950/80 backdrop-blur-lg border-b border-secondary-200/50 dark:border-secondary-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
              <QRCodeIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-secondary-900 dark:text-white">
              <span className="text-primary-600">oza</span>Menu
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
              Özellikler
            </Link>
            <Link href="/pricing" className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
              Fiyatlandırma
            </Link>
            <Link href="/login" className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium">
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40"
            >
              Ücretsiz Dene
            </Link>
          </div>

          {/* Mobile menu button */}
          <Link
            href="/register"
            className="md:hidden px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            Başla
          </Link>
        </div>
      </div>
    </nav>
  )
}

// Footer component
function Footer() {
  return (
    <footer className="bg-secondary-900 dark:bg-secondary-950 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <QRCodeIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                <span className="text-primary-400">oza</span>Menu
              </span>
            </div>
            <p className="text-secondary-400 text-sm leading-relaxed">
              Türkiye&apos;nin en modern dijital menu platformu. Ticaret Bakanlığı uyumlu.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Ürün</h4>
            <ul className="space-y-2 text-sm text-secondary-400">
              <li><Link href="/features" className="hover:text-white transition-colors">Özellikler</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Fiyatlandırma</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Ücretsiz Dene</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Şirket</h4>
            <ul className="space-y-2 text-sm text-secondary-400">
              <li><a href="#" className="hover:text-white transition-colors">Hakkımızda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Kariyer</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Destek</h4>
            <ul className="space-y-2 text-sm text-secondary-400">
              <li><a href="#" className="hover:text-white transition-colors">Yardım Merkezi</a></li>
              <li><a href="#" className="hover:text-white transition-colors">İletişim</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-secondary-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-secondary-500 text-sm">
            © 2024 ozaMenu. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-secondary-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
              </svg>
            </a>
            <a href="#" className="text-secondary-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="#" className="text-secondary-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function HomePage() {
  return (
    <>
      <Navigation />

      <main className="bg-white dark:bg-secondary-950">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
          <AnimatedBackground />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left content */}
              <div className="text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 rounded-full mb-6">
                  <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    Ticaret Bakanlığı Uyumlu
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-secondary-900 dark:text-white mb-6">
                  Dijital Menünüzle{' '}
                  <span className="relative">
                    <span className="text-primary-600 dark:text-primary-400">Fark</span>
                    <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary-500/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                      <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="4" fill="none" />
                    </svg>
                  </span>{' '}
                  Yaratın
                </h1>

                <p className="text-lg sm:text-xl text-secondary-600 dark:text-secondary-400 mb-8 max-w-xl mx-auto lg:mx-0">
                  QR kod taratın, menüyü görüntüleyin. Bu kadar basit. Müşterilerinize modern bir deneyim sunun,
                  fiyat değişikliklerinizi kayıt altına alın.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <Link
                    href="/register"
                    className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-0.5 text-center"
                  >
                    Ücretsiz Başla
                  </Link>
                  <Link
                    href="/features"
                    className="w-full sm:w-auto px-8 py-4 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 font-semibold rounded-xl hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-all duration-200 text-center flex items-center justify-center gap-2"
                  >
                    <span>Özellikleri Gör</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="mt-12 pt-8 border-t border-secondary-200 dark:border-secondary-800">
                  <p className="text-xs text-secondary-500 uppercase tracking-wider mb-4">
                    Güvenilen markalar tarafından kullanılıyor
                  </p>
                  <div className="flex items-center justify-center lg:justify-start gap-8 opacity-50">
                    <span className="text-xl font-bold text-secondary-400">Restaurant A</span>
                    <span className="text-xl font-bold text-secondary-400">Cafe B</span>
                    <span className="text-xl font-bold text-secondary-400">Bistro C</span>
                  </div>
                </div>
              </div>

              {/* Right content - Phone mockup */}
              <div className="hidden lg:block">
                <AnimatedQRDemo />
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-secondary-300 dark:border-secondary-600 rounded-full p-1">
              <div className="w-1.5 h-2.5 bg-secondary-400 rounded-full mx-auto animate-scrollDown" />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-secondary-50 dark:bg-secondary-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCard value="500" suffix="+" label="Aktif İşletme" />
              <StatCard value="1M" suffix="+" label="Menu Görüntüleme" />
              <StatCard value="99.9" suffix="%" label="Çalışma Süresi" />
              <StatCard value="4.9" suffix="/5" label="Müşteri Puanı" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                Özellikler
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white">
                Modern İşletmeler İçin Modern Çözümler
              </h2>
              <p className="mt-4 text-lg text-secondary-600 dark:text-secondary-400">
                Menü yönetimini basitleştiren, müşteri deneyimini iyileştiren ve regülasyonlara uyumlu güçlü özellikler.
              </p>
            </div>

            {/* Features grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<QRCodeIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
                title="Anında QR Kod"
                description="Kayıt olur olmaz QR kodunuz hazır. SVG, PNG ve A5 PDF formatlarında indirin, masalara yerleştirin."
                gradient
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                title="Fiyat Defteri"
                description="Her fiyat değişikliği otomatik olarak kayıt altına alınır. Ticaret Bakanlığı denetimleri için hazır."
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                }
                title="Sürükle-Bırak Düzenleyici"
                description="Kategoriler, ürünler ve görsellerle menünüzü kolayca düzenleyin. Canlı önizleme ile anında görün."
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                }
                title="Garson Çağrı Sistemi"
                description="Müşteriler tek tuşla garson çağırabilir. Anlık bildirimlerle hızlı hizmet sunun."
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Esnek Fiyatlandırma"
                description="Happy hour, günün özel yemeği, sezonluk fiyatlar. Tüm fiyat senaryolarınızı destekleyin."
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                title="Alerjen Bilgileri"
                description="Müşterilerinizi alerjenler hakkında bilgilendirin. Yasal uyumluluk ve müşteri güvenliği."
              />
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <Link
                href="/features"
                className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold hover:gap-3 transition-all"
              >
                Tüm özellikleri keşfedin
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-secondary-50 dark:bg-secondary-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                Nasıl Çalışır
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white">
                3 Adımda Dijital Menünüz Hazır
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative text-center">
                <div className="w-16 h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg shadow-primary-500/30">
                  1
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-3">Kayıt Olun</h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  E-posta adresinizle hızlıca kayıt olun ve işletmenizi oluşturun.
                </p>
                {/* Connector line */}
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-500 to-primary-300" />
              </div>

              {/* Step 2 */}
              <div className="relative text-center">
                <div className="w-16 h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg shadow-primary-500/30">
                  2
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-3">Menünüzü Ekleyin</h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  Kategoriler ve ürünlerinizi ekleyin, fiyatları belirleyin.
                </p>
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-400 to-primary-300" />
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg shadow-primary-500/30">
                  3
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-3">QR Kodunuzu Paylaşın</h3>
                <p className="text-secondary-600 dark:text-secondary-400">
                  QR kodunuzu indirin ve masalarınıza yerleştirin. Hepsi bu kadar!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                Müşteri Yorumları
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white">
                İşletme Sahipleri Ne Diyor?
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <TestimonialCard
                quote="ozaMenu sayesinde menü güncellemelerimiz artık dakikalar içinde müşterilerimize ulaşıyor. Basılan menü derdi son buldu."
                author="Ahmet Yılmaz"
                role="Restoran Sahibi, İstanbul"
                avatar="AY"
              />
              <TestimonialCard
                quote="Fiyat defteri özelliği müthiş. Denetimler geldiğinde tüm kayıtlar hazır, hiçbir sorun yaşamıyoruz."
                author="Zeynep Kaya"
                role="Kafe İşletmecisi, Ankara"
                avatar="ZK"
              />
              <TestimonialCard
                quote="Garson çağrı sistemi müşteri memnuniyetimizi %30 artırdı. Basit ama çok etkili bir çözüm."
                author="Mehmet Demir"
                role="Bistro Sahibi, İzmir"
                avatar="MD"
              />
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-24 bg-secondary-50 dark:bg-secondary-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                Fiyatlandırma
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white">
                Her İşletmeye Uygun Planlar
              </h2>
              <p className="mt-4 text-lg text-secondary-600 dark:text-secondary-400">
                Ücretsiz başlayın, büyüdükçe yükseltin. Gizli ücret yok.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
              <PricingTier
                name="Ücretsiz"
                price="₺0"
                features={[
                  '3 kategori',
                  '20 ürün',
                  'QR kod oluşturma',
                  'Fiyat defteri',
                  'Temel destek'
                ]}
              />
              <PricingTier
                name="Gold"
                price="₺299"
                features={[
                  'Sınırsız kategori',
                  'Sınırsız ürün',
                  'Görsel yükleme',
                  'Garson çağrı sistemi',
                  'Alerjen bilgileri',
                  'Öncelikli destek'
                ]}
                isPopular
              />
              <PricingTier
                name="Enterprise"
                price="Özel"
                period=""
                features={[
                  'Tüm Gold özellikleri',
                  'Çoklu şube desteği',
                  'API erişimi',
                  'Özel entegrasyonlar',
                  '7/24 destek'
                ]}
                ctaText="İletişime Geç"
              />
            </div>

            <div className="text-center mt-12">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold hover:gap-3 transition-all"
              >
                Tüm planları karşılaştırın
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-700" />
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Dijital Menüye Geçiş İçin Doğru Zaman
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Binlerce işletme gibi siz de ozaMenu ile müşterilerinize modern bir deneyim sunun.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-secondary-50 transition-all duration-200 shadow-lg hover:-translate-y-0.5"
              >
                Ücretsiz Hesap Oluştur
              </Link>
              <Link
                href="/features"
                className="w-full sm:w-auto px-8 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-400 transition-all duration-200 border border-white/20"
              >
                Demo İncele
              </Link>
            </div>
            <p className="mt-6 text-white/60 text-sm">
              Kredi kartı gerektirmez • 2 dakikada kurulum
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
