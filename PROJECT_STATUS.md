# Oyun Platformu Durum ve Yol Haritasi

Son guncelleme: 2026-04-27

## Koruma Ilkesi

Bu projede bugune kadar gelistirilmis hicbir oyun, ekran, servis, gorsel veya ses varligi silinmeyecek. Urun odagini sade tutmak gerektiginde icerikler yalnizca pasif, deneysel veya ikincil koleksiyon olarak siniflandirilacak.

## Mevcut Asama

Proje genis bir erken MVP durumunda. Cocuk oyunlari, sosyal-duygusal hikayeler, muzik kutusu, yaratici cizim, veli/ogretmen/admin ekranlari, Supabase kayitlari, raporlama motoru ve dinamik zorluk ayarlama denemeleri mevcut.

Ana sorun icerik eksikligi degil; odak, mimari ayrisma ve guvenilir surumleme eksikligi. Ana deneyim su anda tek buyuk dosyada toplaniyor: `app/(tabs)/index.tsx`. Bu dosya auth, kayit, menu, oyun yonlendirme, skor kaydi ve cizim yuklemeyi birlikte tasiyor.

## Teknik Durum

- TypeScript kontrolu geciyor: `npx tsc --noEmit`
- Lint kontrolu geciyor: `npm run lint`
- Lint uyarilari halen mevcut; agirlikli olarak hook dependency, kullanilmayan degisken ve import sirasi uyarilari.
- Expo 54 ile uyumsuz `expo-file-system` kullanimi legacy API'ye cekildi.
- `ShadowDetective` config tipi mevcut kullanimla uyumlu hale getirildi.
- `reset-password` web-only stil alanlari TypeScript ile uyumlu hale getirildi.
- `KodlamaOyunu` icindeki tip daralmasi ve editor tool tipi derlenebilir hale getirildi.

## Urun Konumu

Oyunlar su anda fazla sayida ve ayni seviyede gorunuyor. Bu nedenle kullanici deneyimi "karisik ve alakasiz" hissi verebilir. Cozum oyun silmek degil; oyunlari bir ogrenme yolu icinde konumlandirmak.

Onerilen ilk surum ilkesi:

- Cekirdek vitrin az ve net olsun.
- Diger gelistirmeler korunup "Kesif", "Hikayeler", "Muzik Kutusu" veya "Deneysel" alanlarinda dursun.
- Her oyun icin yas, kazanim, zorluk, veri kaydi ve stabilite durumu takip edilsin.

## Oyun Envanteri

### Cekirdek Vitrine Aday

Bu oyunlar ilk urun anlatimini tasimaya en uygun adaylar:

- Hafiza Oyunu: bellek ve dikkat
- Siralama Oyunu: siralama ve temel matematik
- Eksik Sayi Bul: sayi farkindaligi
- Gruplama Oyunu: siniflandirma
- Mutfak Dedektifi: siniflandirma ve gorsel dikkat
- Miktar Karsilastirma: miktar algisi
- Sayi Komsulari veya Onluk Cerceve: temel sayi iliskileri

### Ikincil / Kesif Koleksiyonu

Bu oyunlar korunmali, ancak ilk ekranda ayni agirlikta durmalari gerekmiyor:

- Diziyi Tamamla
- Bunu Soyle
- Kodlama Oyunu
- Rakam Yazma
- Kutuyu Bul
- Sayilari Birlestir
- Yapboz Oyunu
- Golge Dedektifi
- Tarti Dengesi
- Sihirli Siseler
- Sihirli Tuval
- Uzay Bloklari
- Renkli Baglantalar

### Sosyal-Duygusal Hikayeler

Bunlar ayri bir "Hikayeler" deneyimi gibi konumlanmali:

- Ceviz Macera
- Aile Sepeti Macerasi
- Adalet Hikayesi

### Yaraticilik ve Muzik

Bunlar ana ogrenme yolunu destekleyen yan deneyimler olarak degerli:

- Yaratici Cizim
- Muzik Calar ve sarkilar

## Eksikler ve Riskler

- README proje gercegini anlatmiyor; halen Expo sablon metni.
- Ana ekran cok buyuk ve cok sorumluluk tasiyor.
- Supabase client birden fazla yerde kuruluyor.
- Admin giris bilgileri kod icinde hardcoded.
- Supabase RLS politikalari fazla acik.
- Turnstile/CAPTCHA degiskenleri var ancak aktif akista kullanilmiyor.
- Test altyapisi yok.
- Oyunlarin kazanim-yas-zorluk haritasi kod disinda belgelenmemis.
- Raporlama motoru var, ancak veri semasi ve oyunlardan gelen metrikler tutarli hale getirilmeli.

## Yol Haritasi

### 1. Stabilite

- TypeScript ve lint hatalarini sifirda tut.
- Build komutunu duzenli calistir.
- Kirik import, API uyumsuzlugu ve deploy engellerini onceliklendir.

### 2. Urun Sadelestirme

- Ana menude cekirdek vitrin ve kesif alanlarini ayir.
- Oyunlari silmeden `aktif`, `ikincil`, `deneysel` etiketleriyle yonet.
- Cocuk icin ilk ekrani daha az secenekli, daha yonlendirici hale getir.

### 3. Mimari Ayristirma

- `app/(tabs)/index.tsx` icinden auth, skor kaydi, oyun katalogu ve ekranlari ayir.
- Ortak Supabase client kullan.
- Oyun metadata listesini merkezi bir dosyaya tasi.

### 4. Guvenlik ve Veri

- Admin girisini Supabase auth veya guvenli rol kontrolune tasi.
- RLS politikalarini kapali varsayimla yeniden duzenle.
- Skor tablosu alanlarini oyun metrikleriyle tutarli hale getir.

### 5. Raporlama Degeri

- Veli raporu: kisa, pozitif, ev aktivitesi odakli.
- Ogretmen raporu: kazanim, hata dagilimi, mudale onerisi odakli.
- Admin raporu: ham veri, export, uzman onayi odakli.

## Bir Sonraki Mantikli Is Paketi

1. Merkezi `gameCatalog` olustur.
2. Ana menu verisini bu katalogdan okut.
3. Katalogda oyunlari `core`, `secondary`, `story`, `creative`, `music`, `experimental` olarak etiketle.
4. Mevcut oyun komponentlerini silmeden sadece menu sunumunu sadeleştir.
5. README'yi bu dosyaya referans verecek sekilde guncelle.
