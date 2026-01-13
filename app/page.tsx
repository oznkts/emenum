import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ozaMenu - Dijital QR Menu ve Fiyat Defteri',
  description:
    'Türkiye\'deki restoran, kafe ve benzeri işletmeler için Ticaret Bakanlığı regülasyonlarına uyumlu Dijital Fiyat Defteri ve QR Menu SaaS platformu.',
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-secondary-900 sm:text-6xl">
          <span className="text-primary-600">oza</span>Menu
        </h1>
        <p className="mt-6 text-lg leading-8 text-secondary-600">
          Dijital QR Menu ve Fiyat Defteri Platformu
        </p>
        <p className="mt-2 text-sm text-secondary-500">
          Ticaret Bakanlığı regülasyonlarına uyumlu
        </p>
      </div>
    </main>
  )
}
