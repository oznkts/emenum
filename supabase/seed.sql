-- Seed Data for e-menum.net QR Menu SaaS Platform
-- Description: Initial features, plans, and plan-feature mappings
-- Created: 2026-01-13
--
-- This seed file populates the dynamic package management system with:
-- 1. Features catalog (system capabilities)
-- 2. Plans (subscription packages)
-- 3. Plan-feature mappings (what each plan includes)
--
-- IMPORTANT: This follows the dynamic permission system pattern.
-- No hard-coded plan checks in application code!

-- ============================================================================
-- FEATURES SEED DATA
-- ============================================================================
-- Categories: 'limits', 'modules', 'support', 'ai'
-- Types: 'boolean' (on/off), 'limit' (numeric)

INSERT INTO features (key, name, description, type, category, sort_order) VALUES
    -- Limits
    ('limit_categories', 'Kategori Limiti', 'Maksimum kategori sayisi', 'limit', 'limits', 1),
    ('limit_products', 'Urun Limiti', 'Maksimum urun sayisi', 'limit', 'limits', 2),
    ('limit_languages', 'Dil Limiti', 'Desteklenen dil sayisi', 'limit', 'limits', 3),
    ('retention_days', 'Kayit Saklama Suresi', 'Denetim kayitlarinin saklanma suresi (gun)', 'limit', 'limits', 4),
    ('export_formats', 'Disa Aktarma Formatlari', 'Desteklenen disa aktarma format sayisi', 'limit', 'limits', 5),
    ('ai_token_quota', 'AI Token Kotasi', 'Aylik AI token limiti', 'limit', 'ai', 6),

    -- Core Modules
    ('module_images', 'Gorsel Sistemi', 'Urun gorseli yukleme ve gosterme', 'boolean', 'modules', 10),
    ('module_logo', 'Logo Kullanimi', 'Ozel logo gosterimi', 'boolean', 'modules', 11),
    ('module_theme', 'Tema Ozellestirme', 'Arka plan rengi ve tema ayarlari', 'boolean', 'modules', 12),
    ('module_chef_recommendation', 'Sefin Tavsiyesi', 'Urunlere "Sefin Tavsiyesi" rozeti', 'boolean', 'modules', 13),
    ('module_daily_special', 'Gunun Spesiyeli', 'Urunlere "Gunun Spesiyeli" rozeti', 'boolean', 'modules', 14),
    ('module_allergens', 'Alerjen Bilgisi', 'Urunlerde alerjen uyarilari', 'boolean', 'modules', 15),
    ('module_nutrition', 'Besin Degerleri', 'Kalori, protein, karbonhidrat bilgisi', 'boolean', 'modules', 16),

    -- Advanced Modules
    ('module_waiter_call', 'Garson Cagirma', 'QR ile garson cagirma sistemi', 'boolean', 'modules', 20),
    ('module_happy_hour', 'Happy Hour', 'Zamanlanmis indirim kampanyalari', 'boolean', 'modules', 21),
    ('module_social_share', 'Sosyal Paylasim', 'Urunleri sosyal medyada paylasma', 'boolean', 'modules', 22),
    ('module_google_business', 'Google Benim Isletmem', 'Google My Business entegrasyonu', 'boolean', 'modules', 23),
    ('module_cross_sell', 'Capraz Satis', 'Bununla Iyi Gider onerisi', 'boolean', 'modules', 24),
    ('module_variants', 'Urun Varyantlari', 'Boyut, porsiyon varyantlari', 'boolean', 'modules', 25),
    ('module_modifiers', 'Urun Eklemeleri', 'Ekstra malzeme ve modifierlar', 'boolean', 'modules', 26),
    ('module_bundles', 'Menu Paketleri', 'Set menu ve paket olusturma', 'boolean', 'modules', 27),

    -- Operations
    ('bulk_operations', 'Toplu Islemler', 'Toplu ice/disa aktarma', 'boolean', 'modules', 30),
    ('module_ai_generation', 'AI Icerik Uretimi', 'Yapay zeka ile icerik olusturma', 'boolean', 'ai', 31),

    -- Support
    ('priority_support', 'Oncelikli Destek', 'Hizli destek hatti erisimi', 'boolean', 'support', 40);

-- ============================================================================
-- PLANS SEED DATA
-- ============================================================================
-- Plans follow Turkish market pricing with TRY currency
-- Note: spec.md DON'T section says "Use seed SQL for initial data (use migrations + import packages)"
-- However, seed data for features/plans is explicitly required by the implementation plan.

INSERT INTO plans (name, description, price_monthly, price_yearly, currency, is_active, is_public, sort_order, features_summary) VALUES
    ('Free', 'Ucretsiz Baslangic', 0.00, 0.00, 'TRY', true, true, 1,
     'Sinirli kategori ve urun, temel menu ozellikleri'),
    ('Lite', 'Kucuk Isletmeler Icin', 149.00, 1490.00, 'TRY', true, true, 2,
     'Daha fazla urun, gorsel sistemi, logo kullanimi'),
    ('Gold', 'Buyuyen Isletmeler Icin', 299.00, 2990.00, 'TRY', true, true, 3,
     'Sefin tavsiyesi, gunun spesiyeli, coklu dil destegi'),
    ('Platinum', 'Profesyonel Isletmeler Icin', 499.00, 4990.00, 'TRY', true, true, 4,
     'Garson cagirma, happy hour, sosyal paylasim, besin degerleri'),
    ('Enterprise', 'Kurumsal Cozumler', NULL, NULL, 'TRY', true, false, 5,
     'Ozel limitsiz ozellikler, oncelikli destek, ozel entegrasyonlar');

-- ============================================================================
-- PLAN_FEATURES SEED DATA
-- ============================================================================
-- Maps features to plans with their values
-- value_boolean: true/false for boolean features
-- value_limit: numeric value for limit features

INSERT INTO plan_features (plan_id, feature_id, value_boolean, value_limit)
SELECT
    p.id AS plan_id,
    f.id AS feature_id,
    CASE
        -- Free Plan
        WHEN p.name = 'Free' AND f.key = 'limit_categories' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'limit_products' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'limit_languages' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'retention_days' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'export_formats' THEN NULL
        WHEN p.name = 'Free' AND f.key = 'ai_token_quota' THEN NULL
        WHEN p.name = 'Free' AND f.type = 'boolean' THEN false

        -- Lite Plan
        WHEN p.name = 'Lite' AND f.key IN ('module_images', 'module_logo', 'module_theme', 'module_allergens') THEN true
        WHEN p.name = 'Lite' AND f.key = 'limit_categories' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'limit_products' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'limit_languages' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'retention_days' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'export_formats' THEN NULL
        WHEN p.name = 'Lite' AND f.key = 'ai_token_quota' THEN NULL
        WHEN p.name = 'Lite' AND f.type = 'boolean' THEN false

        -- Gold Plan
        WHEN p.name = 'Gold' AND f.key IN ('module_images', 'module_logo', 'module_theme', 'module_allergens',
            'module_chef_recommendation', 'module_daily_special', 'module_nutrition') THEN true
        WHEN p.name = 'Gold' AND f.key = 'limit_categories' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'limit_products' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'limit_languages' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'retention_days' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'export_formats' THEN NULL
        WHEN p.name = 'Gold' AND f.key = 'ai_token_quota' THEN NULL
        WHEN p.name = 'Gold' AND f.type = 'boolean' THEN false

        -- Platinum Plan
        WHEN p.name = 'Platinum' AND f.key IN ('module_images', 'module_logo', 'module_theme', 'module_allergens',
            'module_chef_recommendation', 'module_daily_special', 'module_nutrition',
            'module_waiter_call', 'module_happy_hour', 'module_social_share', 'module_google_business',
            'module_cross_sell', 'module_variants', 'module_modifiers', 'bulk_operations') THEN true
        WHEN p.name = 'Platinum' AND f.key = 'limit_categories' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'limit_products' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'limit_languages' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'retention_days' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'export_formats' THEN NULL
        WHEN p.name = 'Platinum' AND f.key = 'ai_token_quota' THEN NULL
        WHEN p.name = 'Platinum' AND f.type = 'boolean' THEN false

        -- Enterprise Plan (all features enabled)
        WHEN p.name = 'Enterprise' AND f.type = 'boolean' THEN true
        WHEN p.name = 'Enterprise' AND f.type = 'limit' THEN NULL

        ELSE false
    END AS value_boolean,
    CASE
        -- Free Plan Limits
        WHEN p.name = 'Free' AND f.key = 'limit_categories' THEN 3
        WHEN p.name = 'Free' AND f.key = 'limit_products' THEN 20
        WHEN p.name = 'Free' AND f.key = 'limit_languages' THEN 1
        WHEN p.name = 'Free' AND f.key = 'retention_days' THEN 7
        WHEN p.name = 'Free' AND f.key = 'export_formats' THEN 1
        WHEN p.name = 'Free' AND f.key = 'ai_token_quota' THEN 0

        -- Lite Plan Limits
        WHEN p.name = 'Lite' AND f.key = 'limit_categories' THEN 10
        WHEN p.name = 'Lite' AND f.key = 'limit_products' THEN 50
        WHEN p.name = 'Lite' AND f.key = 'limit_languages' THEN 1
        WHEN p.name = 'Lite' AND f.key = 'retention_days' THEN 30
        WHEN p.name = 'Lite' AND f.key = 'export_formats' THEN 2
        WHEN p.name = 'Lite' AND f.key = 'ai_token_quota' THEN 0

        -- Gold Plan Limits
        WHEN p.name = 'Gold' AND f.key = 'limit_categories' THEN 25
        WHEN p.name = 'Gold' AND f.key = 'limit_products' THEN 150
        WHEN p.name = 'Gold' AND f.key = 'limit_languages' THEN 3
        WHEN p.name = 'Gold' AND f.key = 'retention_days' THEN 90
        WHEN p.name = 'Gold' AND f.key = 'export_formats' THEN 3
        WHEN p.name = 'Gold' AND f.key = 'ai_token_quota' THEN 1000

        -- Platinum Plan Limits
        WHEN p.name = 'Platinum' AND f.key = 'limit_categories' THEN 100
        WHEN p.name = 'Platinum' AND f.key = 'limit_products' THEN 500
        WHEN p.name = 'Platinum' AND f.key = 'limit_languages' THEN 5
        WHEN p.name = 'Platinum' AND f.key = 'retention_days' THEN 365
        WHEN p.name = 'Platinum' AND f.key = 'export_formats' THEN 5
        WHEN p.name = 'Platinum' AND f.key = 'ai_token_quota' THEN 10000

        -- Enterprise Plan Limits (unlimited represented as high values)
        WHEN p.name = 'Enterprise' AND f.key = 'limit_categories' THEN 999999
        WHEN p.name = 'Enterprise' AND f.key = 'limit_products' THEN 999999
        WHEN p.name = 'Enterprise' AND f.key = 'limit_languages' THEN 10
        WHEN p.name = 'Enterprise' AND f.key = 'retention_days' THEN 3650
        WHEN p.name = 'Enterprise' AND f.key = 'export_formats' THEN 10
        WHEN p.name = 'Enterprise' AND f.key = 'ai_token_quota' THEN 100000

        ELSE NULL
    END AS value_limit
FROM plans p
CROSS JOIN features f
ORDER BY p.sort_order, f.sort_order;
