# PIM Product - ERPNext Item Entegrasyonu

## Genel Bakış

PIM uygulamasındaki "Product" DocType, ERPNext'teki "Item" DocType ile **aynı veritabanı tablosunu** (`tabItem`) kullanmalıdır. Bu sayede stok ve envanter yönetiminde mükerrer kayıt oluşturma ihtiyacı ortadan kalkar.

---

## Kavramsal Analiz

### Item vs Product: Aynı Şey mi?

| Kavram | ERPNext Item | PIM Product |
|--------|--------------|-------------|
| **Odak** | Stok, satın alma, satış, muhasebe | Pazarlama, kanal yönetimi, zengin içerik |
| **Alanlar** | SKU, UOM, fiyat, stok seviyesi | Açıklama, görseller, SEO, kategori |
| **Kullanıcı** | Depo, finans, satın alma | Pazarlama, e-ticaret, içerik ekibi |
| **Çıktı** | ERP işlemleri | Katalog, website, marketplace |

**Sonuç:** Aynı "şey" değiller ama aynı "entity"yi temsil ediyorlar. PIM, Item'ın pazarlama katmanıdır.

### Frappe'de İş Akışı Nasıl İşliyor?

ERPNext'te `Item` DocType şu şekilde çalışır:

1. Item oluşturulur → `tabItem` tablosuna kayıt
2. Website Item oluşturulur → Item'a link ile bağlı ayrı tablo (`tabWebsite Item`)
3. Stock Entry, Sales Order vb. → Item'a referans verir

**Problem:** Website Item yaklaşımı ayrı tablo kullanıyor, bu da sync problemlerine yol açıyor.

---

## Mimari Karar

### Seçenek 1: Virtual DocType (Önerilen)

PIM Product'ı **Virtual DocType** olarak tanımlayıp, backend'de `tabItem` tablosunu data source olarak kullan.

```
┌─────────────────────────────────────────────────────────────────┐
│                        tabItem (tek tablo)                       │
├─────────────────────────────────────────────────────────────────┤
│  item_code │ item_name │ stock_uom │ ... │ pim_* alanlar        │
└─────────────────────────────────────────────────────────────────┘
                    ▲                           ▲
                    │                           │
            ┌───────┴───────┐           ┌──────┴──────┐
            │  ERPNext Item │           │ PIM Product │
            │   (Normal)    │           │  (Virtual)  │
            └───────────────┘           └─────────────┘
```

**Avantajlar:**
- Tek tablo, sıfır mükerrer kayıt
- Stok ve envanter otomatik senkron
- Farklı UI/UX aynı data üzerinde
- ERPNext upgrade'lerinde sorun yok

**Dezavantajlar:**
- Virtual DocType implementasyonu gerekli
- PIM-specific alanlar için Custom Fields lazım

### Seçenek 2: Link Field ile Bağlantı (Önerilmez)

```
┌─────────────┐        Link Field        ┌─────────────┐
│  tabItem    │ ◄─────────────────────── │ tabProduct  │
└─────────────┘                          └─────────────┘
```

**Problem:** İki ayrı tablo, sync gerekli, mükerrer kayıt riski.

### Seçenek 3: Item DocType'a Custom Fields (Alternatif)

Item DocType'a PIM alanlarını fixture olarak ekle. Ayrı Product DocType oluşturma.

**Problem:** UI karmaşıklaşır, PIM-specific iş mantığı zorlaşır.

---

## Uygulama Detayları

### Virtual DocType Yapılandırması

```python
# pim/product/doctype/product/product.py

import frappe
from frappe.model.document import Document

class Product(Document):
    """
    Virtual DocType - tabItem tablosunu backend olarak kullanır
    """

    @staticmethod
    def get_list(args):
        """List view için Item'ları getir"""
        return frappe.get_all("Item",
            filters=args.get("filters"),
            fields=["name", "item_code", "item_name", "item_group",
                    "pim_title", "pim_description", "pim_status"],
            limit_page_length=args.get("limit_page_length", 20),
            limit_start=args.get("limit_start", 0)
        )

    @staticmethod
    def get_count(args):
        """Toplam kayıt sayısı"""
        return frappe.db.count("Item", args.get("filters"))

    def db_insert(self, *args, **kwargs):
        """Yeni kayıt = Item oluştur"""
        item = frappe.new_doc("Item")
        self._map_product_to_item(item)
        item.insert()
        self.name = item.name

    def load_from_db(self):
        """Mevcut kaydı yükle"""
        item = frappe.get_doc("Item", self.name)
        self._map_item_to_product(item)

    def db_update(self, *args, **kwargs):
        """Güncelleme = Item güncelle"""
        item = frappe.get_doc("Item", self.name)
        self._map_product_to_item(item)
        item.save()

    def delete(self):
        """Silme = Item sil"""
        frappe.delete_doc("Item", self.name)

    def _map_product_to_item(self, item):
        """Product alanlarını Item'a map et"""
        item.item_code = self.product_code
        item.item_name = self.product_name
        # PIM custom fields
        item.pim_title = self.pim_title
        item.pim_description = self.pim_description
        item.pim_status = self.pim_status

    def _map_item_to_product(self, item):
        """Item alanlarını Product'a map et"""
        super(Document, self).__init__({
            "name": item.name,
            "product_code": item.item_code,
            "product_name": item.item_name,
            "pim_title": item.pim_title,
            "pim_description": item.pim_description,
            "pim_status": item.pim_status,
        })
```

### Item DocType'a Eklenecek Custom Fields

```json
// fixtures/custom_field.json
[
    {
        "doctype": "Custom Field",
        "dt": "Item",
        "fieldname": "pim_section",
        "fieldtype": "Section Break",
        "label": "PIM Information",
        "insert_after": "description"
    },
    {
        "doctype": "Custom Field",
        "dt": "Item",
        "fieldname": "pim_title",
        "fieldtype": "Data",
        "label": "PIM Title",
        "insert_after": "pim_section"
    },
    {
        "doctype": "Custom Field",
        "dt": "Item",
        "fieldname": "pim_description",
        "fieldtype": "Text Editor",
        "label": "PIM Description",
        "insert_after": "pim_title"
    },
    {
        "doctype": "Custom Field",
        "dt": "Item",
        "fieldname": "pim_status",
        "fieldtype": "Select",
        "label": "PIM Status",
        "options": "Draft\nIn Review\nApproved\nPublished",
        "insert_after": "pim_description"
    }
]
```

### DocType JSON (Virtual)

```json
{
    "doctype": "DocType",
    "name": "Product",
    "module": "PIM",
    "is_virtual": 1,
    "fields": [
        {
            "fieldname": "product_code",
            "fieldtype": "Data",
            "label": "Product Code",
            "reqd": 1
        },
        {
            "fieldname": "product_name",
            "fieldtype": "Data",
            "label": "Product Name",
            "reqd": 1
        },
        {
            "fieldname": "pim_title",
            "fieldtype": "Data",
            "label": "Title"
        },
        {
            "fieldname": "pim_description",
            "fieldtype": "Text Editor",
            "label": "Description"
        },
        {
            "fieldname": "pim_status",
            "fieldtype": "Select",
            "label": "Status",
            "options": "Draft\nIn Review\nApproved\nPublished",
            "default": "Draft"
        }
    ]
}
```

---

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  PIM Product │     │ ERPNext Item │     │ Website Item │
│   (Virtual)  │     │   (Normal)   │     │   (Normal)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │    CRUD ops        │    Link field      │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│                      tabItem                             │
│  (Single Source of Truth for Product/Item data)         │
└──────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Stock Entry  │  │  Sales Order  │  │   Purchase    │
│               │  │               │  │    Order      │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## Dikkat Edilecek Noktalar

1. **is_virtual: 1** → DocType JSON'da mutlaka işaretlenmeli
2. **Controller methods** → `db_insert`, `load_from_db`, `db_update`, `delete`, `get_list`, `get_count` implemente edilmeli
3. **Custom Fields** → Item'a PIM alanları fixture ile eklenmeli
4. **Permissions** → Product DocType için ayrı role permissions tanımlanabilir
5. **Hooks** → `doc_events` ile Item üzerindeki değişiklikler dinlenebilir

---

## Sonuç

Virtual DocType yaklaşımı ile:
- **Tek tablo** kullanılır (`tabItem`)
- **Mükerrer kayıt** oluşmaz
- **Stok/Envanter** otomatik senkron
- **PIM UI/UX** bağımsız tasarlanabilir
- **ERPNext** core'a dokunulmaz, upgrade-safe

Evet, temel akışı netleştirelim:

## ERPNext'te Ürün/Stok Akışı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ERPNext Akışı                                  │
└─────────────────────────────────────────────────────────────────────────┘

1. ÜRÜN TANIMI
   Item DocType → tabItem tablosu
   ├── item_code: "LAPTOP-001"
   ├── item_name: "Dell XPS 15"
   ├── item_group: "Electronics"
   ├── stock_uom: "Nos"
   └── is_stock_item: 1

2. STOK GİRİŞİ (Stock Entry / Purchase Receipt)
   ├── Item: "LAPTOP-001"
   ├── Warehouse: "Stores - ABC"
   ├── Qty: 100
   └── → tabStock Ledger Entry (stok hareketi)
         → tabBin (anlık stok özeti)

3. STOK SORGULAMA
   frappe.db.get_value("Bin",
       {"item_code": "LAPTOP-001", "warehouse": "Stores - ABC"},
       "actual_qty"
   )
   → 100
```

## PIM Nereye Kaydetmeli?

**Cevap: Aynı yere (`tabItem`)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              DOĞRU YAKLAŞIM                              │
└─────────────────────────────────────────────────────────────────────────┘

                        tabItem (TEK TABLO)
    ┌──────────────────────────────────────────────────────┐
    │ item_code │ item_name │ stock_uom │ pim_title │ ... │
    └──────────────────────────────────────────────────────┘
              ▲                              ▲
              │                              │
     ERPNext Item Form                PIM Product Form
     (Stok/Finans ekibi)              (Pazarlama ekibi)
              │                              │
              └──────────┬───────────────────┘
                         │
                         ▼
              Stock Entry, Purchase Order,
              Sales Order, etc. hepsi
              aynı item_code'u referans alır


┌─────────────────────────────────────────────────────────────────────────┐
│                              YANLIŞ YAKLAŞIM                             │
└─────────────────────────────────────────────────────────────────────────┘

    tabItem                              tabProduct (AYRI!)
    ┌────────────────┐                   ┌────────────────┐
    │ item_code: X   │  ← SYNC LAZIM! →  │ product_code: X│
    └────────────────┘                   └────────────────┘
         │                                     │
         │                                     │
    Stok işlemleri                    PIM içerik işlemleri
    burada çalışır                    burada çalışır
         │                                     │
         └─────── PROBLEM: Hangisi doğru? ─────┘
```

## Envanter/Stok Nasıl Güncellenir?

Stok hiçbir zaman direkt güncellenmez, **hareketlerle** güncellenir:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STOK GÜNCELLEME AKIŞI                           │
└─────────────────────────────────────────────────────────────────────────┘

                    Item (tabItem)
                         │
                         │ referans
                         ▼
    ┌────────────────────────────────────────────────────┐
    │              STOK HAREKETLERİ                      │
    ├────────────────────────────────────────────────────┤
    │  Stock Entry      → Material Receipt (+stok)      │
    │  Stock Entry      → Material Issue (-stok)        │
    │  Purchase Receipt → Satın alma girişi (+stok)     │
    │  Delivery Note    → Sevkiyat (-stok)              │
    │  Sales Invoice    → Satış (update_stock=1) (-stok)│
    └────────────────────────────────────────────────────┘
                         │
                         │ otomatik
                         ▼
    ┌────────────────────────────────────────────────────┐
    │           Stock Ledger Entry (tabStock Ledger Entry)│
    │  Her hareket için bir kayıt oluşur                 │
    │  actual_qty: +100 veya -50                         │
    └────────────────────────────────────────────────────┘
                         │
                         │ aggregate
                         ▼
    ┌────────────────────────────────────────────────────┐
    │                  Bin (tabBin)                      │
    │  item_code + warehouse bazında anlık özet          │
    │  actual_qty: 150 (toplam)                          │
    └────────────────────────────────────────────────────┘
```

## PIM için Pratik Uygulama

```python
# PIM'den stok sorgulamak için:
def get_product_stock(item_code, warehouse=None):
    """PIM Product için stok bilgisi getir"""
    filters = {"item_code": item_code}
    if warehouse:
        filters["warehouse"] = warehouse

    bins = frappe.get_all("Bin",
        filters=filters,
        fields=["warehouse", "actual_qty", "reserved_qty", "projected_qty"]
    )
    return bins

# Örnek çıktı:
# [
#   {"warehouse": "Stores - ABC", "actual_qty": 100, "reserved_qty": 10, "projected_qty": 90},
#   {"warehouse": "Finished Goods - ABC", "actual_qty": 50, ...}
# ]
```

## Özet

| Soru | Cevap |
|------|-------|
| ERPNext'te ürünler kaydedilebiliyor mu? | Evet, `Item` DocType → `tabItem` tablosu |
| PIM aynı yere mi kaydetmeli? | **Evet**, Virtual DocType ile aynı `tabItem`'a |
| Stok nasıl güncellenir? | Direkt değil, Stock Entry/Purchase Receipt gibi hareketlerle |
| PIM stok görebilir mi? | Evet, `Bin` tablosundan okuyarak |

PIM'in işi ürün **tanımı** (içerik, görseller, açıklamalar), stok **hareketleri** ERPNext'in işi. Aynı Item kaydını paylaşarak ikisi de kendi işini yapar.
