# ozaMenu - Dijital QR Menu ve Fiyat Defteri Platformu

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

**Turkiye'deki restoran, kafe ve benzeri isletmeler icin Ticaret Bakanligi regulasyonlarina uyumlu Dijital Fiyat Defteri ve QR Menu SaaS platformu.**

## Icindekiler

- [Proje Hakkinda](#proje-hakkinda)
- [Ozellikler](#ozellikler)
- [Teknoloji Yigini](#teknoloji-yigini)
- [On Kosullar](#on-kosullar)
- [Kurulum](#kurulum)
- [Ortam Degiskenleri](#ortam-degiskenleri)
- [Veritabani Kurulumu](#veritabani-kurulumu)
- [Gelistirme](#gelistirme)
- [Test](#test)
- [Proje Yapisi](#proje-yapisi)
- [Paket Ozellikleri](#paket-ozellikleri)
- [Deployment](#deployment)
- [Mimari Kararlar](#mimari-kararlar)
- [Katki](#katki)
- [Lisans](#lisans)

---

## Proje Hakkinda

ozaMenu, isletmelerin dijital menuleri yonetmelerini saglayan, hukuki uyumlu bir SaaS platformudur. Platform, sadece gorsel bir menu degil, **yasal olarak gecerli, denetlenebilir ve degismez fiyat kaydi tutan** bir sistemdir.

### Temel Avantajlar

- **Hukuki Uyumluluk**: Ticaret Bakanligi regulasyonlarina uygun fiyat defteri
- **Degismez Kayit**: Fiyat degisiklikleri INSERT-only pattern ile saklanir, UPDATE/DELETE yasak
- **Multi-Tenant Mimari**: Her isletme sadece kendi verisine erisebilir (RLS ile korunur)
- **Masa Bazli QR**: Musterinin hangi masada oturdugu bilinir, garson bildirimleri
- **Dinamik Paket Yonetimi**: Hard-coded limit yok, tum ozellikler veritabanindan yonetilir

---

## Ozellikler

### Temel Ozellikler

| Ozellik | Aciklama |
|---------|----------|
| Degismez Fiyat Defteri | Tum fiyat degisiklikleri tarihce olarak saklanir, hukuki kanit niteliginde |
| Multi-Tenant Izolasyon | RLS politikalari ile isletmeler arasi veri izolasyonu |
| Dinamik Feature Flags | Paket ozellikleri veritabanindan yonetilir, kod degisikligi gerektirmez |
| Masa QR Sistemi | Her masaya ozel QR kod, musteri takibi |
| Realtime Garson Bildirimleri | Supabase Realtime ile anlik bildirimler |
| SHA-256 Menu Snapshot | Her fiyat degisikliginde menu durumu hash'lenir |
| RBAC Yetkilendirme | Owner, Admin, Manager, Waiter, Viewer rolleri |

### Panel Ozellikleri

- **Merchant Paneli**: Urun, kategori, masa yonetimi, fiyat guncelleme
- **Super Admin Paneli**: Isletme aktivasyonu, paket yonetimi, ozel izinler
- **Garson Paneli**: Realtime servis talepleri, masa durumu
- **Audit Log**: Tum islemlerin denetim kaydi

---

## Teknoloji Yigini

### Frontend
| Teknoloji | Versiyon | Aciklama |
|-----------|----------|----------|
| Next.js | 15.5.x | React framework (App Router) |
| TypeScript | 5.7.x | Tip guvenli JavaScript |
| Tailwind CSS | 4.x | Utility-first CSS framework |
| React | 19.x | UI kutuphanesi |

### Backend & Veritabani
| Teknoloji | Aciklama |
|-----------|----------|
| Supabase | PostgreSQL, Auth, Realtime, Storage |
| PostgreSQL | Iliskisel veritabani |
| Row Level Security | Veri izolasyonu |

### Araclar
| Arac | Aciklama |
|------|----------|
| Vitest | Test framework |
| ESLint | Kod kalitesi |
| QRCode | QR kod uretimi |

---

## On Kosullar

Projeyi calistirmadan once asagidakilerin kurulu olmasi gerekmektedir:

1. **Node.js** >= 20.9
   ```bash
   # Node.js versiyonunu kontrol edin
   node --version

   # nvm kullaniyorsaniz
   nvm install 20
   nvm use 20
   ```

2. **npm** veya **pnpm**
   ```bash
   npm --version
   ```

3. **Supabase Hesabi**
   - [supabase.com](https://supabase.com) adresinden ucretsiz hesap olusturun
   - Yeni bir proje olusturun

4. **Git**
   ```bash
   git --version
   ```

---

## Kurulum

### 1. Repoyu Klonlama

```bash
git clone https://github.com/your-org/ozon-qr-menu.git
cd ozon-qr-menu
```

### 2. Bagimliliklari Yukleme

```bash
npm install
```

### 3. Ortam Degiskenlerini Ayarlama

```bash
# Ornek dosyayi kopyalayin
cp .env.local.example .env.local

# Dosyayi duzenleyin ve Supabase bilgilerinizi girin
nano .env.local  # veya tercih ettiginiz editoru kullanin
```

### 4. Veritabani Migrasyonlarini Calistirma

Supabase Dashboard uzerinden veya Supabase CLI ile migrasyonlari calistirin:

```bash
# Supabase CLI kurulumu (opsiyonel)
npm install -g supabase

# Local Supabase baslat (opsiyonel - gelistirme icin)
npx supabase start

# Migrasyonlari uygula
npx supabase db push
```

Manuel olarak Supabase Dashboard > SQL Editor uzerinden de calistirabilirsiniz:
1. `supabase/migrations/` klasorundeki dosyalari sirayla calistirin
2. `supabase/seed.sql` dosyasini calistirarak baslangic verisini ekleyin

### 5. Gelistirme Sunucusunu Baslatma

```bash
npm run dev
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde calisacaktir.

---

## Ortam Degiskenleri

`.env.local` dosyasinda asagidaki degiskenleri tanimlayin:

```env
# Supabase Project URL
# Supabase Dashboard > Settings > API > Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase Anonymous (Public) Key
# Supabase Dashboard > Settings > API > Project API keys > anon public
# Bu anahtar client-side'da guvenle kullanilabilir (RLS ile korunur)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Service Role Key (GIZLI - ASLA CLIENT'A EXPOSE ETME!)
# Supabase Dashboard > Settings > API > Project API keys > service_role
# Bu anahtar RLS'i bypass eder, sadece server-side'da kullanin
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Ortam Degiskenlerini Bulma

1. [Supabase Dashboard](https://supabase.com/dashboard) adresine gidin
2. Projenizi secin
3. **Settings** > **API** bolumune gidin
4. Asagidaki degerleri kopyalayin:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

> **UYARI**: `SUPABASE_SERVICE_ROLE_KEY` anahtarini asla client-side kodunda kullanmayin veya Git'e commit etmeyin!

---

## Veritabani Kurulumu

### Migrasyon Dosyalari

Veritabani semasi asagidaki migrasyon dosyalariyla olusturulur:

| Dosya | Aciklama |
|-------|----------|
| `001_core_tables.sql` | Organizations, members, categories tablolari |
| `002_products_price_ledger.sql` | Products ve immutable price_ledger |
| `003_package_management.sql` | Features, plans, subscriptions |
| `004_tables_service_requests.sql` | Masa ve garson sistemi |
| `005_audit_compliance.sql` | Menu snapshots ve audit logs |
| `006_views.sql` | current_prices ve diger view'lar |
| `007_rls_policies.sql` | Row Level Security politikalari |
| `010_auto_snapshot_trigger.sql` | Otomatik snapshot trigger'i |

### Seed Data

`supabase/seed.sql` dosyasi asagidaki baslangic verisini icerir:

- **Features Katalogu**: 27 farkli ozellik tanimlamasi
- **Paket Tanimlari**: Lite, Pro, Premium paketleri
- **Paket-Ozellik Eslesmeleri**: Her paketin hangi ozelliklere sahip oldugu

### Migrasyonlari Elle Calistirma

Supabase Dashboard > SQL Editor'de sirayla:

```sql
-- Her dosyayi sirayla kopyalayip calistirin
-- 1. supabase/migrations/001_core_tables.sql
-- 2. supabase/migrations/002_products_price_ledger.sql
-- ... devam edin
-- Son olarak seed.sql dosyasini calistirin
```

---

## Gelistirme

### Kullanilabilir Komutlar

```bash
# Gelistirme sunucusu
npm run dev

# Production build
npm run build

# Production sunucusu
npm start

# ESLint kontrolu
npm run lint

# TypeScript tip kontrolu
npm run typecheck

# Testleri calistir
npm run test

# Testleri izleme modunda calistir
npm run test:watch

# Tek seferlik test calistir
npm run test:run

# Coverage raporu
npm run test:coverage

# Test UI
npm run test:ui
```

### Kod Stili

- **TypeScript**: Strict mode aktif
- **ESLint**: Next.js recommended kurallar
- **Import Sirasi**: React, Next.js, harici, dahili

### Hot Module Replacement

Gelistirme modunda dosya degisiklikleri otomatik olarak tarayiciya yansir.

---

## Test

### Test Calistirma

```bash
# Tum testleri calistir
npm run test

# Belirli bir dosyayi test et
npm run test lib/guards/__tests__/permission.test.ts

# Coverage ile calistir
npm run test:coverage
```

### Test Yapisi

```
tests/
├── __mocks__/           # Mock dosyalari
│   └── supabase.ts      # Supabase client mock
lib/
├── guards/
│   └── __tests__/
│       └── permission.test.ts
├── __tests__/
│   └── price-ledger-immutability.test.ts
tests/
└── __tests__/
    └── integration/
        ├── auth-flow.test.ts
        ├── price-change-flow.test.ts
        ├── waiter-call-flow.test.ts
        └── rls-isolation.test.ts
```

---

## Proje Yapisi

```
ozon-qr-menu/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth sayfalari (login, register)
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Merchant paneli
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── tables/
│   │   ├── waiter/
│   │   ├── audit/
│   │   └── settings/
│   ├── (admin)/                  # Super Admin paneli
│   │   └── admin/
│   │       ├── organizations/
│   │       ├── plans/
│   │       └── overrides/
│   ├── menu/[slug]/              # Public menu sayfasi
│   ├── api/                      # API Route Handlers
│   │   └── auth/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global stiller
├── components/                   # React componentleri
│   ├── ui/                       # Temel UI componentleri
│   ├── admin/                    # Admin componentleri
│   ├── auth/                     # Auth componentleri
│   └── providers/                # Context providers
├── lib/                          # Utility fonksiyonlari
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── guards/                   # Permission guards
│   │   ├── permission.ts
│   │   └── limits.ts
│   ├── services/                 # Business logic
│   │   ├── price-ledger.ts
│   │   └── snapshot.ts
│   ├── actions/                  # Server actions
│   └── qrcode/                   # QR kod utilities
├── hooks/                        # Custom React hooks
│   └── useTableContext.ts
├── types/                        # TypeScript tipleri
│   ├── database.ts               # Supabase tipleri
│   └── index.ts
├── supabase/                     # Supabase dosyalari
│   ├── migrations/               # SQL migrasyonlari
│   └── seed.sql                  # Baslangic verisi
├── tests/                        # Test dosyalari
├── middleware.ts                 # Next.js middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md                     # Bu dosya
```

---

## Paket Ozellikleri

### Paket Karsilastirmasi

| Ozellik | Lite | Pro | Premium |
|---------|:----:|:---:|:-------:|
| Kategori Limiti | 3 | Sinirsiz | Sinirsiz |
| Urun Limiti | 20 | Sinirsiz | Sinirsiz |
| Aylik Fiyat Degisikligi | 2 | Sinirsiz | Sinirsiz |
| Gorsel Yukleme | - | + | + |
| Logo Kullanimi | - | + | + |
| Arka Plan Renklendirme | - | + | + |
| Sefin Tavsiyesi Etiketi | - | + | + |
| Gunun Spesiyeli Etiketi | - | + | + |
| Coklu Dil Destegi | - | 1 Dil | 3 Dil |
| Hizli Destek Hatti | - | + | + |
| Bununla Iyi Gider (Capraz Satis) | - | - | + |
| Happy Hour Zamanlayici | - | - | + |
| Sosyal Medyada Paylas | - | - | + |
| Besin Degerleri | - | - | + |
| Google Isletmem Entegrasyonu | - | - | + |
| WhatsApp Destek | - | - | + |

### Fiyatlandirma

- **Lite**: Ucretsiz - Temel ozellikler
- **Pro**: 299 TL/ay - Profesyonel ozellikler
- **Premium**: 599 TL/ay - Tum ozellikler + oncelikli destek

---

## Deployment

### Vercel ile Deployment

1. [Vercel](https://vercel.com) hesabi olusturun
2. GitHub reposunu baglayın
3. Ortam degiskenlerini Vercel Dashboard'da tanimlayın:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy edin

```bash
# Vercel CLI ile (opsiyonel)
npm i -g vercel
vercel
```

### Production Kontrol Listesi

- [ ] Tum ortam degiskenleri tanimli
- [ ] Supabase RLS politikalari aktif
- [ ] SSL/HTTPS aktif (Vercel otomatik saglar)
- [ ] Veritabani migrasyonlari tamamlandi
- [ ] Seed data yuklendi
- [ ] Super Admin kullanicisi olusturuldu

### Supabase Production Ayarlari

1. **RLS Kontrolu**: Tum tablolarda RLS aktif olmali
2. **Auth Settings**: Email dogrulama aktif
3. **Database**: Connection pooling aktif
4. **Storage**: Public bucket'lar icin CORS ayarlari

---

## Mimari Kararlar

### 1. Degismez Fiyat Defteri (Price Ledger)

Fiyatlar `products` tablosunda degil, ayri bir `price_ledger` tablosunda tutulur:

```sql
-- YANLIS: Fiyati dogrudan urun tablosunda guncelleme
UPDATE products SET price = 100 WHERE id = 'xxx'; -- YASAK!

-- DOGRU: Yeni fiyat kaydi ekleme
INSERT INTO price_ledger (product_id, price, change_reason)
VALUES ('xxx', 100, 'Yeni sezon fiyati');
```

Bu yaklasim:
- Tum fiyat gecmisini korur
- Hukuki uyumluluk saglar
- Audit trail olusturur
- Database trigger ile UPDATE/DELETE engellenir

### 2. Feature Permission Guard

Paket kontrolleri hard-coded degil, dinamik olarak veritabanindan yapilir:

```typescript
// YANLIS
if (user.package === 'Pro') { ... } // YASAK!

// DOGRU
if (await hasPermission(orgId, 'module_waiter_call')) { ... }
```

### 3. Row Level Security (RLS)

Her isletme sadece kendi verisine erisebilir:

```sql
CREATE POLICY "Users can view own organization products"
ON products FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

### 4. Supabase Client Pattern

- **Browser**: `createBrowserClient()` - Client components icin
- **Server**: `createServerSupabaseClient()` - Server components ve API routes icin

---

## Katki

1. Fork edin
2. Feature branch olusturun (`git checkout -b feature/amazing-feature`)
3. Degisikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request acin

### Commit Mesaji Formati

```
<type>: <description>

[optional body]
```

Tipler: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## Lisans

Bu proje ozel lisans altindadir. Tum haklari saklidir.

---

## Destek

Sorulariniz veya sorunlariniz icin:
- GitHub Issues acin
- Email: support@ozamenu.com

---

**ozaMenu** - Turkiye'nin hukuki uyumlu dijital menu platformu

