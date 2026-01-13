Bu taleplerin (Masa Bazlı QR ve Dinamik Paket Yönetimi), bir İş Analisti (BA) gözüyle teknik ekibe (Developer) aktarılması için gereken dokümantasyonu aşağıda hazırladım.

Bu doküman, geliştiricinin **"Neyi, Neden ve Nasıl"** yapacağını anlamasını sağlayan **Teknik Gereksinim Dokümanı (TRD)** formatındadır. Supabase ve Vercel mimarisine özel notlar eklenmiştir.

---

# 📂 MODÜL 1: Masa Bazlı QR ve Akıllı Garson Çağırma

**Amaç:** Müşterinin hangi masada olduğunu manuel girmesine gerek kalmadan, QR kodun taşıdığı veri ile sistemin bunu tanıması ve garsonun doğru masaya yönlendirilmesi.

### 1.1. Kullanıcı Hikayeleri (User Stories)

* **Restoran Yöneticisi Olarak:** Yönetim panelinden restoranımdaki masa sayısını tanımlamak ve her masa için "Benzersiz (Unique) QR" üretip indirmek istiyorum.
* **Müşteri Olarak:** QR kodu okuttuğumda açılan menüde "Garson Çağır" butonuna basarsam, sistemin otomatik olarak benim 5 numaralı masada olduğumu bilmesini istiyorum.
* **Garson Olarak:** Bildirim ekranıma "5 Numaralı Masa - Garson İstiyor" şeklinde sesli ve görsel bildirim düşmesini istiyorum.

### 1.2. Teknik Akış ve Veri Yapısı (Developer İçin)

#### A. URL Yapısı (Parametre Yönetimi)

Müşteri QR'ı okuttuğunda gideceği URL statik olmamalıdır.

* **Yanlış:** `app.menu.com/restoran-adi` (Masa belli değil)
* **Doğru:** `app.menu.com/restoran-adi?table_id=uuid-hash`

#### B. Veritabanı Modeli (Supabase Schema)

`tables` adında yeni bir tabloya ihtiyaç var.

```sql
TABLE: restaurant_tables
------------------------
id (UUID)           : Primary Key
organization_id     : Foreign Key (Hangi restoran?)
table_number        : Text (Örn: "Bahçe-1", "Teras-5")
qr_uuid             : UUID (URL'de görünecek, tahmin edilemez ID)
current_status      : Enum ('empty', 'occupied', 'service_needed')
last_ping_at        : Timestamp (Son garson çağırma zamanı - spam engellemek için)

```

#### C. Fonksiyonel Gereksinimler (Acceptance Criteria)

1. **QR Üretimi:** Admin panelde "Masa Ekle" dendiğinde, sistem arkaplanda o masa için bir `qr_uuid` üretmeli ve bunu Vercel üzerinde `qrencode` vb. kütüphanelerle QR görsele çevirmeli.
2. **Context (Bağlam) Taşıma:** Kullanıcı siteye girdiğinde `?table_id=...` parametresi `localStorage`'a kaydedilmeli. Kullanıcı sayfayı yenilese bile sistem hangi masada olduğunu unutmamalı.
3. **Realtime Bildirim (Supabase Realtime):**
* Müşteri butona bastığında `service_requests` tablosuna bir satır eklenir (`INSERT`).
* Garsonun kullandığı panel, Supabase Realtime ile bu tabloya `SUBSCRIBE` (abone) olmalı.
* Yeni satır eklendiği an garsonun ekranında "Pop-up" açılmalı.



---

# 📂 MODÜL 2: Dinamik Paket Yönetimi ve Hibrit RBAC/ABAC

**Amaç:** Yazılım koduna müdahale etmeden, Super Admin panelinden yeni paketler (Örn: "Yılbaşı Özel Paketi") oluşturabilmek, özellikleri bu paketlere atayabilmek ve restoranların yetkilerini bu paketlere göre (veya paket harici istisnalarla) yönetmek.

### 2.1. Kavramsal Model (Business Logic)

Bu yapı **"Feature Flagging" (Özellik Bayraklama)** tabanlı bir lisanslama modelidir.

1. **Feature (Özellik):** Sistemin yapabildiği en küçük birim. (Örn: `can_upload_logo`, `can_call_waiter`, `max_products_50`).
2. **Plan (Paket):** Özelliklerin bir kümesidir. (Örn: "Pro Paket" = `can_upload_logo` + `can_call_waiter`).
3. **Subscription (Abonelik):** Restoranın bir pakete sahip olmasıdır.
4. **Override (İstisna):** Restoran "Lite" pakettedir ama biz ona "Jest" olarak `can_call_waiter` özelliğini manuel açarız.

### 2.2. Veritabanı Mimarisi (Supabase Schema) - KRİTİK BÖLÜM

Yazılımcıya bu şemayı verin. Bu yapı **Dinamik Paket + İnce Ayar Yetki** sağlar.

```sql
-- 1. ÖZELLİK KATALOĞU (Sistemin tüm yetenekleri burada tanımlı)
TABLE: features
----------------
id (PK)
key (Text, Unique)      : örn: 'module_waiter_call', 'limit_menu_items'
description (Text)      : örn: 'Garson çağırma modülü', 'Maksimum ürün sayısı'
type (Enum)             : 'boolean' (var/yok) veya 'limit' (sayısal değer)

-- 2. PAKET TANIMLARI (Lite, Pro, Premium burada oluşturulur)
TABLE: plans
----------------
id (PK)
name (Text)             : 'Lite', 'Pro', 'Enterprise'
price_monthly (Decimal)
is_active (Boolean)

-- 3. PAKET - ÖZELLİK EŞLEŞTİRMESİ (Hangi pakette ne var?)
TABLE: plan_features
----------------
plan_id (FK)
feature_id (FK)
value_boolean (Bool)    : True/False (Bu özellik pakette var mı?)
value_limit (Int)       : Örn: 50 (Bu pakette 50 ürün limiti var)

-- 4. RESTORAN ABONELİKLERİ (Müşteri ne satın aldı?)
TABLE: subscriptions
----------------
organization_id (FK)
plan_id (FK)
status                  : 'active', 'past_due'
valid_until             : Timestamp

-- 5. İSTİSNA YETKİLERİ (Custom Overrides - Paket dışı yetki verme)
-- Bu tablo, pakette olmasa bile restorana özel yetki vermeyi sağlar (ABAC)
TABLE: organization_feature_overrides
----------------
organization_id (FK)
feature_id (FK)
override_value          : Paketteki değeri ezer.

```

### 2.3. Yazılım İçinde Kontrol Mantığı (Middleware & Guards)

Yazılımcıdan **"Permission Guard"** yapısı isteyin. Kodun içinde `if (user.package == 'Pro')` gibi kontroller **YASAKLANMALI**.

**Doğru Kod Mantığı (Pseudo Code):**
Sistem şu sırayla yetkiyi kontrol etmeli:

1. Restoranın aktif aboneliği var mı? -> Hangi Plan?
2. Planın içinde istenen özellik (`feature_key`) var mı?
3. **Fakat:** `organization_feature_overrides` tablosunda bu restoran için özel bir izin/yasak var mı? Varsa onu uygula.

```javascript
// Örnek Kullanım (Frontend/Backend)
if ( hasPermission(organizationId, 'module_waiter_call') ) {
   showCallWaiterButton();
} else {
   showUpgradeToProPopup(); // Upsell fırsatı
}

```

### 2.4. RBAC Entegrasyonu (Restoran İçi Roller)

Soru: "Restoranın `Garson Çağırma` paketi var ama her garson ayarları değiştirmemeli."
Çözüm: **Çift Katmanlı Yetki.**

1. **Katman 1 (Lisans):** Restoranın bu özelliği kullanmaya hakkı var mı? (Yukarıdaki Plan yapısı).
2. **Katman 2 (RBAC):** Restoranın içindeki kullanıcının (Garson, Müdür) bu özelliği kullanmaya yetkisi var mı?

**Yazılımcıya Not:**
Supabase `auth.users` tablosuna bağlı bir `profile_roles` tablosu kur.

* `role: 'owner'` -> Her şeyi yapar.
* `role: 'waiter'` -> Sadece `view_orders` ve `update_table_status` yapabilir. `edit_menu` yapamaz.

---

# 🚀 Özet: Business Analyst'ten Geliştiriciye Notlar

1. **Hard-Code Yok:** Kodun içinde "Pro pakette bu özellik var" diye if-else yazılmayacak. Her şey veritabanındaki `features` tablosundan okunacak. Yarın "Mega Paket" çıkarırsak kod değiştirmeden panelden ekleyebilmeliyim.
2. **QR Güvenliği:** `table_id` olarak ardışık sayı (1, 2, 3) kullanmayın. Tahmin edilebilir olur. UUID kullanın.
3. **Supabase RLS (Row Level Security):** Çok kritik. Bir restoranın garsonu, API'ye istek atıp başka restoranın masasını çağıramamalı. RLS politikaları `organization_id` bazlı sıkı tutulmalı.
4. **Upsell Mekanizması:** Frontend tarafında, kullanıcının paketi yetmiyorsa butonu gizlemek yerine "Gri ve Kilitli" gösterin. Tıklayınca "Bu özellik Pro pakette, yükseltmek ister misiniz?" modalı açılsın.

Bu yapı, ürününüzü basit bir menü uygulamasından, ölçeklenebilir bir **SaaS platformuna** dönüştürür.
