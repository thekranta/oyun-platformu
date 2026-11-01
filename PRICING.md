# Fiyat kararları

Son güncelleme: 2026-11-01. Fiyatlar kodda tutulmaz: web fiyatı childhoodtech.com sayfalarında, mağaza fiyatı Apple/Google/RevenueCat konsollarında girilir (uygulama mağazanın verdiği YEREL fiyatı gösterir).

## Genel kural (2026-11-01 kararı)

Web paketleri mağazadan da satılır; **web biraz daha ucuz kalır**. Mağaza fiyatı = web fiyatı ÷ 0,85 (komisyon %15 varsayımı), en yakın ÜST mağaza fiyat basamağına yuvarlanır. Küresel açılış: temel fiyat USD'de girilir, mağazaların otomatik ülke dönüşümü kullanılır, TRY elle ayarlanır. Ayrıntı ve ürün kimlikleri: `MAGAZA_YAYIN_REHBERI.md` Bölüm 2.4.

## Veli paketleri (web ↔ mağaza hedefi)

| Paket | Süre | Web (TR / EN) | Mağaza hedefi (TR / USD) |
|---|---|---|---|
| Tohum | 1 ay | ₺399 / $9.99 | ≈ ₺470 / ≈ $11.75 |
| Filiz | 3 ay | ₺999 / $24.99 | ≈ ₺1.175 / ≈ $29.40 |
| Fidan | 6 ay | ₺1.749 / $44.99 | ≈ ₺2.060 / ≈ $52.90 |
| Orman | 12 ay | ₺2.899 / $69.99 | ≈ ₺3.410 / ≈ $82.30 |

Web'de bunlar tek seferlik ödemeli süreli paketlerdir; mağazada otomatik yenilenen abonelik olarak hazırlandı (açık karar: rehber Bölüm 6, madde 1). Kardeş indirimi (%15) yalnız webde.

## Çınar (sınıf paketi, aylık)

| Kanal | Fiyat | Not |
|---|---|---|
| Web (childhoodtech.com) | ₺2.799/ay (EN sitede Sycamore $74.99/mo) | Eski fiyat ₺1.499 / $39.99 idi; 2026-10-11'de yükseltildi. Çocuk başına ≈ ₺280. |
| Mağaza (App Store / Google Play) | ₺3.299/ay | 2026-10-11 kararı: ₺2.799 ÷ 0,85 ≈ ₺3.293 → ₺3.299. Mağaza komisyonu %15 varsayımıyla web ile aynı net geliri verir. |

Gerekçe:
- Eski fiyat (₺1.499, çocuk başına ≈ ₺150) en ucuz bireysel pakete (Orman, ≈ ₺242/ay) göre çok düşüktü; sınıf paketi bireysel paketlerden ucuz ve daha kapsamlıydı.
- Web ile mağaza aynı net geliri getirsin diye mağaza fiyatı komisyon payı kadar yüksek tutuldu.

## Dikkat edilecekler (kullanıcıda bekleyen)

- Hesaplar %15 komisyon varsayımına dayanır: Apple Small Business Program ve Google'ın %15 oranı için başvuru gerekir (yoksa %30).
- Hesap, web fiyatının KDV dahil olduğu varsayımına dayanır; mali müşavirle doğrulanmalı.
- Apple TL fiyatını sabit basamaklardan seçtirir; ₺3.299'a en yakın üst basamak seçilir. Google'da serbest fiyat girilir.
- RevenueCat entitlement kimlikleri `VeliTier`/`OgretmenTier` string'leriyle birebir aynı olmalı (`cinar`, `mese`) — bkz. `services/purchaseService.ts`.
- Uygulama içinde web fiyatı veya web satın alma bağlantısı gösterilmez (özellikle iOS yönlendirme kuralları).
- Meşe: "size özel" teklif, kuruma göre; mağaza fiyatı yok.
- Mağaza ödemeleri 2022 vergi istisnasına bağlı IBAN'a, web ödemeleri bireysel hesaba gider (ayrı tutulur). Vergi sonucu için mali müşavire danışılmalı.

## Açık kararlar

- Çınar için yıllık seçenek (öneri: iki ay indirim) — henüz yok.
- Çınar'ı öğretmenin kendi hesabıyla mağazadan mı, kuruma fatura ile web'den mi satacağımız ve Apple'ın kurumsal satış kuralları.
