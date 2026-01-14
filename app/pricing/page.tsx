import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Fiyatlandırma - ozaMenu | Dijital QR Menu Platformu',
  description:
    'ozaMenu fiyatlandırma planlarını inceleyin. Ücretsiz başlayın, ihtiyaçlarınız arttıkça yükseltin. Gizli ücret yok.',
  openGraph: {
    title: 'Fiyatlandırma - ozaMenu | Dijital QR Menu Platformu',
    description: 'Her işletmeye uygun planlar. Ücretsiz başlayın, büyüdükçe yükseltin.',
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

// Check icon component
function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

// X icon component
function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// Plan data type
interface PlanFeature {
  name: string
  lite: string | boolean
  gold: string | boolean
  platinum: string | boolean
  enterprise: string | boolean
}

// Feature categories
const featureCategories: { category: string; features: PlanFeature[] }[] = [
  {
    category: 'Temel Özellikler',
    features: [
      { name: 'Kategori Ekleme', lite: '3 Adet', gold: 'Sınırsız', platinum: 'Sınırsız', enterprise: 'Sınırsız' },
      { name: 'Ürün Ekleme', lite: '20 Adet', gold: 'Sınırsız', platinum: 'Sınırsız', enterprise: 'Sınırsız' },
      { name: 'Fiyat Güncelleme', lite: true, gold: true, platinum: true, enterprise: true },
      { name: 'QR Kod Oluşturma', lite: true, gold: true, platinum: true, enterprise: true },
      { name: 'Fiyat Defteri', lite: true, gold: true, platinum: true, enterprise: true },
    ],
  },
  {
    category: 'Görsel & Tasarım',
    features: [
      { name: 'Görsel Yükleme', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Logo Kullanımı', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Arka Plan Renklendirme', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Tema Özelleştirme', lite: false, gold: true, platinum: true, enterprise: true },
    ],
  },
  {
    category: 'Menü Özellikleri',
    features: [
      { name: 'Şefin Tavsiyesi Rozeti', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Günün Spesiyeli', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Alerjen Bilgileri', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Ürün Varyantları', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Ek Seçenekler (Modifiers)', lite: false, gold: true, platinum: true, enterprise: true },
    ],
  },
  {
    category: 'Gelişmiş Özellikler',
    features: [
      { name: 'Çoklu Dil Desteği', lite: false, gold: '1 Dil', platinum: '3 Dil', enterprise: 'Sınırsız' },
      { name: 'Happy Hour Zamanlayıcı', lite: false, gold: false, platinum: true, enterprise: true },
      { name: 'Yanında İyi Gider (Çapraz Satış)', lite: false, gold: false, platinum: true, enterprise: true },
      { name: 'Besin Değerleri Gösterimi', lite: false, gold: false, platinum: true, enterprise: true },
      { name: 'Sosyal Medya Paylaşım Butonu', lite: false, gold: false, platinum: true, enterprise: true },
      { name: 'Google İşletmem Entegrasyonu', lite: false, gold: false, platinum: true, enterprise: true },
    ],
  },
  {
    category: 'İşletme Özellikleri',
    features: [
      { name: 'Garson Çağrı Sistemi', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Masa QR Kodları', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Toplu İçe/Dışa Aktarma', lite: false, gold: false, platinum: true, enterprise: true },
      { name: 'Çoklu Şube Desteği', lite: false, gold: false, platinum: false, enterprise: true },
      { name: 'API Erişimi', lite: false, gold: false, platinum: false, enterprise: true },
    ],
  },
  {
    category: 'Destek',
    features: [
      { name: 'E-posta Desteği', lite: true, gold: true, platinum: true, enterprise: true },
      { name: 'Öncelikli Destek', lite: false, gold: true, platinum: true, enterprise: true },
      { name: 'Canlı Destek', lite: false, gold: false, platinum: true, enterprise: true },
      { name: '7/24 Destek', lite: false, gold: false, platinum: false, enterprise: true },
      { name: 'Özel Hesap Yöneticisi', lite: false, gold: false, platinum: false, enterprise: true },
    ],
  },
]

// Pricing tier component
function PricingCard({
  name,
  price,
  period = '/ay',
  description,
  features,
  isPopular = false,
  ctaText = 'Başla',
  ctaHref = '/register',
}: {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  isPopular?: boolean
  ctaText?: string
  ctaHref?: string
}) {
  return (
    <div
      className={`relative rounded-3xl p-8 ${
        isPopular
          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-2xl shadow-primary-500/30 scale-105 z-10'
          : 'bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
            EN POPÜLER
          </span>
        </div>
      )}
      <div className="text-center mb-8">
        <h3
          className={`text-xl font-semibold mb-2 ${isPopular ? 'text-white' : 'text-secondary-900 dark:text-white'}`}
        >
          {name}
        </h3>
        <p className={`text-sm mb-4 ${isPopular ? 'text-white/80' : 'text-secondary-500'}`}>
          {description}
        </p>
        <div className="flex items-baseline justify-center gap-1">
          <span
            className={`text-5xl font-bold ${isPopular ? 'text-white' : 'text-secondary-900 dark:text-white'}`}
          >
            {price}
          </span>
          {period && (
            <span className={`text-sm ${isPopular ? 'text-white/70' : 'text-secondary-500'}`}>
              {period}
            </span>
          )}
        </div>
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                isPopular ? 'bg-white/20' : 'bg-primary-100 dark:bg-primary-900/30'
              }`}
            >
              <CheckIcon className={`w-3 h-3 ${isPopular ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
            </div>
            <span className={`text-sm ${isPopular ? 'text-white/90' : 'text-secondary-600 dark:text-secondary-400'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`block w-full py-4 text-center font-semibold rounded-xl transition-all duration-200 ${
          isPopular
            ? 'bg-white text-primary-600 hover:bg-secondary-50 shadow-lg'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {ctaText}
      </Link>
    </div>
  )
}

// Feature value cell component
function FeatureValue({ value, isHighlighted = false }: { value: string | boolean; isHighlighted?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <div className={`flex items-center justify-center ${isHighlighted ? 'text-white' : ''}`}>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center ${
            isHighlighted ? 'bg-white/20' : 'bg-primary-100 dark:bg-primary-900/30'
          }`}
        >
          <CheckIcon className={`w-4 h-4 ${isHighlighted ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
        </div>
      </div>
    ) : (
      <div className="flex items-center justify-center">
        <XIcon className="w-5 h-5 text-secondary-300 dark:text-secondary-600" />
      </div>
    )
  }

  return (
    <span
      className={`text-sm font-medium ${
        isHighlighted ? 'text-white' : 'text-secondary-900 dark:text-white'
      }`}
    >
      {value}
    </span>
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
            <Link
              href="/features"
              className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium"
            >
              Özellikler
            </Link>
            <Link href="/pricing" className="text-primary-600 dark:text-primary-400 font-medium">
              Fiyatlandırma
            </Link>
            <Link
              href="/login"
              className="text-secondary-600 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium"
            >
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
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  Özellikler
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Fiyatlandırma
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Ücretsiz Dene
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Şirket</h4>
            <ul className="space-y-2 text-sm text-secondary-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Hakkımızda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Kariyer
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Destek</h4>
            <ul className="space-y-2 text-sm text-secondary-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Yardım Merkezi
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  İletişim
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Gizlilik Politikası
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-secondary-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-secondary-500 text-sm">© 2024 ozaMenu. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-secondary-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
              </svg>
            </a>
            <a href="#" className="text-secondary-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a href="#" className="text-secondary-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function PricingPage() {
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
                  Şeffaf Fiyatlandırma
                </span>
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-secondary-900 dark:text-white mb-6">
                Her İşletmeye{' '}
                <span className="text-primary-600 dark:text-primary-400">Uygun</span> Planlar
              </h1>

              <p className="text-xl text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto mb-10">
                Ücretsiz başlayın, büyüdükçe yükseltin. Gizli ücret yok, sürpriz yok.
                İhtiyacınız olanı seçin.
              </p>

              {/* Billing toggle - for future implementation */}
              <div className="inline-flex items-center gap-4 p-1.5 bg-secondary-100 dark:bg-secondary-800 rounded-xl">
                <button className="px-4 py-2 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white font-medium rounded-lg shadow-sm">
                  Aylık
                </button>
                <button className="px-4 py-2 text-secondary-600 dark:text-secondary-400 font-medium rounded-lg hover:text-secondary-900 dark:hover:text-white transition-colors">
                  Yıllık <span className="text-primary-600 dark:text-primary-400 text-xs">%20 indirim</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section className="pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
              <PricingCard
                name="Lite"
                price="₺0"
                description="Küçük işletmeler için ideal başlangıç"
                features={[
                  '3 kategori',
                  '20 ürün',
                  'QR kod oluşturma',
                  'Fiyat defteri',
                  'E-posta desteği',
                ]}
                ctaText="Ücretsiz Başla"
              />
              <PricingCard
                name="Gold"
                price="₺299"
                description="Büyüyen işletmeler için önerilen"
                features={[
                  'Sınırsız kategori ve ürün',
                  'Görsel yükleme',
                  'Logo ve tema özelleştirme',
                  'Garson çağrı sistemi',
                  'Şef tavsiyesi rozeti',
                  '1 dil desteği',
                  'Öncelikli destek',
                ]}
                isPopular
              />
              <PricingCard
                name="Platinum"
                price="₺599"
                description="Premium özelliklerle tam kontrol"
                features={[
                  'Tüm Gold özellikleri',
                  'Happy hour zamanlayıcı',
                  'Besin değerleri gösterimi',
                  'Çapraz satış önerileri',
                  'Sosyal medya entegrasyonu',
                  'Google İşletmem',
                  '3 dil desteği',
                  'Canlı destek',
                ]}
              />
              <PricingCard
                name="Enterprise"
                price="Özel"
                period=""
                description="Kurumsal çözümler ve özel ihtiyaçlar"
                features={[
                  'Tüm Platinum özellikleri',
                  'Çoklu şube desteği',
                  'API erişimi',
                  'Özel entegrasyonlar',
                  'Sınırsız dil desteği',
                  'Özel hesap yöneticisi',
                  '7/24 destek',
                ]}
                ctaText="İletişime Geç"
                ctaHref="#contact"
              />
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-24 bg-secondary-50 dark:bg-secondary-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                Detaylı Karşılaştırma
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white">
                Tüm Özellikler Karşılaştırması
              </h2>
              <p className="mt-4 text-lg text-secondary-600 dark:text-secondary-400">
                Planların sunduğu tüm özellikleri detaylı olarak inceleyin.
              </p>
            </div>

            <div className="bg-white dark:bg-secondary-900 rounded-2xl shadow-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-5 bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
                <div className="p-6 text-left">
                  <span className="text-sm font-semibold text-secondary-600 dark:text-secondary-400">Özellikler</span>
                </div>
                <div className="p-6 text-center border-l border-secondary-200 dark:border-secondary-700">
                  <span className="text-sm font-semibold text-secondary-900 dark:text-white">Lite</span>
                  <p className="text-xs text-secondary-500 mt-1">Ücretsiz</p>
                </div>
                <div className="p-6 text-center border-l border-secondary-200 dark:border-secondary-700 bg-primary-50 dark:bg-primary-900/20">
                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">Gold</span>
                  <p className="text-xs text-primary-500 mt-1">₺299/ay</p>
                </div>
                <div className="p-6 text-center border-l border-secondary-200 dark:border-secondary-700">
                  <span className="text-sm font-semibold text-secondary-900 dark:text-white">Platinum</span>
                  <p className="text-xs text-secondary-500 mt-1">₺599/ay</p>
                </div>
                <div className="p-6 text-center border-l border-secondary-200 dark:border-secondary-700">
                  <span className="text-sm font-semibold text-secondary-900 dark:text-white">Enterprise</span>
                  <p className="text-xs text-secondary-500 mt-1">Özel</p>
                </div>
              </div>

              {/* Feature categories */}
              {featureCategories.map((category, categoryIndex) => (
                <div key={category.category}>
                  {/* Category header */}
                  <div className="grid grid-cols-5 bg-secondary-100/50 dark:bg-secondary-800/50 border-b border-secondary-200 dark:border-secondary-700">
                    <div className="col-span-5 p-4">
                      <span className="text-sm font-semibold text-secondary-900 dark:text-white">{category.category}</span>
                    </div>
                  </div>

                  {/* Features */}
                  {category.features.map((feature, featureIndex) => (
                    <div
                      key={feature.name}
                      className={`grid grid-cols-5 ${
                        featureIndex !== category.features.length - 1 || categoryIndex !== featureCategories.length - 1
                          ? 'border-b border-secondary-100 dark:border-secondary-800'
                          : ''
                      }`}
                    >
                      <div className="p-4 flex items-center">
                        <span className="text-sm text-secondary-700 dark:text-secondary-300">{feature.name}</span>
                      </div>
                      <div className="p-4 flex items-center justify-center border-l border-secondary-100 dark:border-secondary-800">
                        <FeatureValue value={feature.lite} />
                      </div>
                      <div className="p-4 flex items-center justify-center border-l border-secondary-100 dark:border-secondary-800 bg-primary-50/50 dark:bg-primary-900/10">
                        <FeatureValue value={feature.gold} isHighlighted={false} />
                      </div>
                      <div className="p-4 flex items-center justify-center border-l border-secondary-100 dark:border-secondary-800">
                        <FeatureValue value={feature.platinum} />
                      </div>
                      <div className="p-4 flex items-center justify-center border-l border-secondary-100 dark:border-secondary-800">
                        <FeatureValue value={feature.enterprise} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* CTA row */}
              <div className="grid grid-cols-5 bg-secondary-50 dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700">
                <div className="p-6" />
                <div className="p-6 flex items-center justify-center border-l border-secondary-200 dark:border-secondary-700">
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-secondary-200 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 font-medium rounded-lg hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors text-sm"
                  >
                    Başla
                  </Link>
                </div>
                <div className="p-6 flex items-center justify-center border-l border-secondary-200 dark:border-secondary-700 bg-primary-50 dark:bg-primary-900/20">
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
                  >
                    Başla
                  </Link>
                </div>
                <div className="p-6 flex items-center justify-center border-l border-secondary-200 dark:border-secondary-700">
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-secondary-200 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 font-medium rounded-lg hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors text-sm"
                  >
                    Başla
                  </Link>
                </div>
                <div className="p-6 flex items-center justify-center border-l border-secondary-200 dark:border-secondary-700">
                  <Link
                    href="#contact"
                    className="px-4 py-2 bg-secondary-200 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-200 font-medium rounded-lg hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors text-sm"
                  >
                    İletişim
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                SSS
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-white">
                Sık Sorulan Sorular
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  question: 'Ücretsiz plan ne kadar süre kullanılabilir?',
                  answer:
                    'Lite planımız süresiz ücretsizdir. 3 kategori ve 20 ürün limiti dahilinde istediğiniz kadar kullanabilirsiniz. Kredi kartı gerektirmez.',
                },
                {
                  question: 'Planları istediğim zaman değiştirebilir miyim?',
                  answer:
                    'Evet, planınızı istediğiniz zaman yükseltebilir veya düşürebilirsiniz. Plan değişiklikleri bir sonraki fatura döneminde geçerli olur. Yükseltmelerde fark anında alınır.',
                },
                {
                  question: 'Ödeme yöntemleri nelerdir?',
                  answer:
                    'Şu anda EFT/Havale ile ödeme kabul ediyoruz. Ödemeniz onaylandıktan sonra hesabınız manuel olarak aktive edilir. Kredi kartı ve otomatik ödeme seçenekleri yakında eklenecektir.',
                },
                {
                  question: 'İptal politikanız nedir?',
                  answer:
                    'İstediğiniz zaman iptal edebilirsiniz. İptal sonrası fatura döneminizin sonuna kadar hizmet almaya devam edersiniz. Kalan süre için iade yapılmaz.',
                },
                {
                  question: 'Enterprise planı için nasıl teklif alabilirim?',
                  answer:
                    'Enterprise planı çoklu şube, özel entegrasyon ve API erişimi gerektiren büyük işletmeler içindir. Özel teklifiniz için bizimle iletişime geçin, ihtiyaçlarınıza göre çözüm sunalım.',
                },
                {
                  question: 'Fiyat defteri özelliği tüm planlarda var mı?',
                  answer:
                    'Evet, Ticaret Bakanlığı uyumu için kritik olan fiyat defteri özelliği tüm planlarımızda mevcuttur. Tüm fiyat değişiklikleriniz otomatik olarak kayıt altına alınır.',
                },
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-700 p-6"
                >
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden" id="contact">
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
              Hala Karar Veremediniz mi?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Ücretsiz Lite planı ile başlayın, ihtiyaçlarınız arttıkça yükseltin.
              2 dakikada hesabınızı oluşturun.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-secondary-50 transition-all duration-200 shadow-lg hover:-translate-y-0.5"
              >
                Ücretsiz Hesap Oluştur
              </Link>
              <a
                href="mailto:info@ozamenu.com"
                className="w-full sm:w-auto px-8 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-400 transition-all duration-200 border border-white/20"
              >
                Bize Ulaşın
              </a>
            </div>
            <p className="mt-6 text-white/60 text-sm">
              Kredi kartı gerektirmez • 2 dakikada kurulum • İstediğiniz zaman iptal
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
