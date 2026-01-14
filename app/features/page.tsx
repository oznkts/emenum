import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Özellikler - ozaMenu | Dijital QR Menu Platformu',
  description:
    'ozaMenu ile QR kod, fiyat defteri, garson çağrı sistemi, sürükle-bırak menü düzenleyici ve daha fazla özelliği keşfedin.',
  openGraph: {
    title: 'Özellikler - ozaMenu | Dijital QR Menu Platformu',
    description:
      'Türkiye\'nin en kapsamlı dijital menu platformunun tüm özelliklerini inceleyin.',
    type: 'website',
  },
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

// Feature section with alternating layout
function FeatureSection({
  title,
  description,
  features,
  icon,
  imageSide = 'right',
  gradient = false,
}: {
  title: string
  description: string
  features: string[]
  icon: React.ReactNode
  imageSide?: 'left' | 'right'
  gradient?: boolean
}) {
  return (
    <div className={`py-20 ${gradient ? 'bg-secondary-50 dark:bg-secondary-900/50' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${imageSide === 'left' ? 'lg:flex-row-reverse' : ''}`}>
          {/* Content */}
          <div className={imageSide === 'left' ? 'lg:order-2' : ''}>
            <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-6">
              {icon}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white mb-4">
              {title}
            </h2>
            <p className="text-lg text-secondary-600 dark:text-secondary-400 mb-8">
              {description}
            </p>
            <ul className="space-y-4">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-secondary-700 dark:text-secondary-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Visual */}
          <div className={`${imageSide === 'left' ? 'lg:order-1' : ''}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-3xl transform rotate-3" />
              <div className="relative bg-white dark:bg-secondary-800 rounded-3xl shadow-2xl p-8 border border-secondary-100 dark:border-secondary-700">
                <div className="aspect-video bg-gradient-to-br from-secondary-100 to-secondary-200 dark:from-secondary-700 dark:to-secondary-600 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      {icon}
                    </div>
                    <span className="text-secondary-500 dark:text-secondary-400 text-sm">Görsel Önizleme</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Feature card for grid
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group p-6 bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">
        {description}
      </p>
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
            <Link href="/features" className="text-primary-600 dark:text-primary-400 font-medium">
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

export default function FeaturesPage() {
  return (
    <>
      <Navigation />

      <main className="bg-white dark:bg-secondary-950">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 to-transparent dark:from-primary-900/10 dark:to-transparent" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-4xl mx-auto">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-6">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  Tüm Özellikler
                </span>
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 dark:text-white mb-6">
                Dijital Menu Yönetiminde{' '}
                <span className="text-primary-600 dark:text-primary-400">Yeni Nesil</span>{' '}
                Çözümler
              </h1>

              <p className="text-xl text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto mb-10">
                İşletmenizi bir adım öne taşıyacak, Ticaret Bakanlığı regülasyonlarına uyumlu,
                kullanıcı dostu özelliklerle tanışın.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-0.5"
                >
                  Ücretsiz Deneyin
                </Link>
                <Link
                  href="/pricing"
                  className="px-8 py-4 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 font-semibold rounded-xl hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-all"
                >
                  Fiyatları İncele
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* QR Code Feature */}
        <FeatureSection
          title="Anında QR Kod Oluşturma"
          description="Kayıt işleminizin ardından saniyeler içinde QR kodunuz hazır. Müşterileriniz telefon kamerasıyla tarayarak menünüze anında erişebilir."
          features={[
            'SVG, PNG (1024/2048/4096px) ve A5 PDF formatlarında indirme',
            'Yüksek hata düzeltme seviyeli QR kodlar',
            'Özelleştirilebilir QR kod tasarımı',
            'Masa bazlı QR kodları ile konum takibi',
            'Değişmeyen URL yapısı - QR kodlarınız her zaman güncel'
          ]}
          icon={<QRCodeIcon className="w-7 h-7 text-primary-600 dark:text-primary-400" />}
        />

        {/* Price Ledger Feature */}
        <FeatureSection
          title="Değiştirilemez Fiyat Defteri"
          description="Tüm fiyat değişiklikleriniz otomatik olarak kayıt altına alınır. Ticaret Bakanlığı denetimlerine her an hazır olun."
          features={[
            'Her fiyat değişikliği zaman damgalı kayıt olarak saklanır',
            'SHA-256 hash ile doğrulanabilir kayıtlar',
            'Geriye dönük fiyat geçmişi raporları',
            'Silme ve değiştirme işlemleri engellenir',
            'JSON formatında denetim dışa aktarımı'
          ]}
          icon={
            <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          imageSide="left"
          gradient
        />

        {/* Drag & Drop Editor Feature */}
        <FeatureSection
          title="Sürükle-Bırak Menü Düzenleyici"
          description="Kategori ve ürünlerinizi kolayca düzenleyin. Canlı önizleme ile değişikliklerinizi anında görün."
          features={[
            'Sezgisel sürükle-bırak arayüzü',
            'Canlı önizleme ile anlık görüntüleme',
            'Geri al/yinele (Undo/Redo) desteği',
            'Otomatik kaydetme - hiçbir değişiklik kaybolmaz',
            'Klavye kısayolları ile hızlı düzenleme'
          ]}
          icon={
            <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          }
        />

        {/* Waiter Call Feature */}
        <FeatureSection
          title="Garson Çağrı Sistemi"
          description="Müşterileriniz tek tuşla garson çağırabilir. Gerçek zamanlı bildirimlerle hızlı hizmet sunun."
          features={[
            'Tek tuşla garson çağırma',
            'Masa bazlı gerçek zamanlı bildirimler',
            'Çağrı durumu takibi (beklemede, onaylandı, tamamlandı)',
            'Spam önleme mekanizması (30 saniye bekleme süresi)',
            'Sesli bildirim uyarıları'
          ]}
          icon={
            <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
          imageSide="left"
          gradient
        />

        {/* Additional Features Grid */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                Daha Fazlası
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white">
                Ve Çok Daha Fazla Özellik
              </h2>
              <p className="mt-4 text-lg text-secondary-600 dark:text-secondary-400">
                İşletmenizin ihtiyaç duyduğu tüm özellikler tek bir platformda.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                title="Görsel Yükleme"
                description="Ürün ve kategori görsellerinizi yükleyin. Otomatik boyutlandırma ve optimizasyon."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                }
                title="Logo & Tema"
                description="İşletmenizin logosunu ekleyin ve menü temasını özelleştirin."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                }
                title="Şef Tavsiyesi"
                description="Özel ürünlerinizi şef tavsiyesi olarak öne çıkarın."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Günün Özel Yemeği"
                description="Her gün değişen özel yemeklerinizi vurgulayın."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                }
                title="Çoklu Dil Desteği"
                description="Menünüzü farklı dillerde sunun. Turist dostu."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Happy Hour"
                description="Belirli saatlerde otomatik indirimli fiyatlar gösterin."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                title="Alerjen Bilgileri"
                description="14 alerjen kategorisinde detaylı bilgi sunun."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                title="Besin Değerleri"
                description="Kalori, protein, karbonhidrat ve yağ bilgilerini gösterin."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                }
                title="Yanında İyi Gider"
                description="Çapraz satış için ürün önerileri ekleyin."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                }
                title="Ürün Varyantları"
                description="Porsiyon boyutları ve farklı seçenekler tanımlayın."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                }
                title="Ek Seçenekler"
                description="Ekstra malzeme ve modifiye seçenekleri ekleyin."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                }
                title="Set Menüler"
                description="Paket menüler ve bundle ürünler oluşturun."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                }
                title="Sosyal Paylaşım"
                description="Menünüzü sosyal medyada kolayca paylaşın."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                title="Google İşletmem"
                description="Google İşletme profilinizle entegre çalışın."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                }
                title="Toplu İşlemler"
                description="Excel/CSV ile toplu ürün içe ve dışa aktarma."
              />

              <FeatureCard
                icon={
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                }
                title="AI Destekli"
                description="Yapay zeka ile ürün açıklamaları oluşturun."
              />
            </div>
          </div>
        </section>

        {/* Compliance Section */}
        <section className="py-24 bg-gradient-to-br from-secondary-900 to-secondary-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-sm font-semibold text-primary-400 uppercase tracking-wider">
                  Regülasyon Uyumu
                </span>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white mb-6">
                  Ticaret Bakanlığı Denetimine Her Zaman Hazır
                </h2>
                <p className="text-lg text-secondary-300 mb-8">
                  Dijital fiyat defteri regülasyonlarına tam uyumlu altyapımız ile denetim kaygısı yaşamayın.
                  Tüm fiyat değişiklikleriniz güvenli bir şekilde saklanır.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-secondary-200">SHA-256 ile şifrelenmiş kayıtlar</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-secondary-200">Silme ve değiştirme engellenmiş</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-secondary-200">JSON formatında dışa aktarma</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-secondary-200">Menu versiyonlama ve anlık görüntü</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-secondary-800 rounded-3xl p-8 border border-secondary-700">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Doğrulanmış Kayıt</p>
                      <p className="text-sm text-secondary-400">SHA-256 Hash</p>
                    </div>
                  </div>
                  <div className="bg-secondary-900 rounded-xl p-4 font-mono text-xs text-secondary-300 break-all">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-secondary-900 rounded-xl p-4">
                      <p className="text-secondary-400 text-sm mb-1">Versiyon</p>
                      <p className="text-white font-semibold">#127</p>
                    </div>
                    <div className="bg-secondary-900 rounded-xl p-4">
                      <p className="text-secondary-400 text-sm mb-1">Tarih</p>
                      <p className="text-white font-semibold">14.01.2026</p>
                    </div>
                  </div>
                </div>
              </div>
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
              Tüm Bu Özelliklerle Hemen Başlayın
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Ücretsiz plan ile başlayın, ihtiyaçlarınız arttıkça yükseltin. Kredi kartı gerektirmez.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-secondary-50 transition-all duration-200 shadow-lg hover:-translate-y-0.5"
              >
                Ücretsiz Hesap Oluştur
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-8 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-400 transition-all duration-200 border border-white/20"
              >
                Planları Karşılaştır
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
