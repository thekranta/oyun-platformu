# Oyun Platformu Durum ve Yol Haritasi

Son guncelleme: 2026-06-20

## Koruma Ilkesi

Bu projede bugune kadar gelistirilmis hicbir oyun, ekran, servis, gorsel veya ses varligi silinmeyecek. Urun odagini sade tutmak gerektiginde icerikler yalnizca pasif, deneysel veya ikincil koleksiyon olarak siniflandirilacak.

## Mevcut Asama

Proje genis bir erken MVP durumunda. Cocuk oyunlari, sosyal-duygusal hikayeler, muzik kutusu, yaratici cizim, veli/ogretmen/admin ekranlari, Supabase kayitlari, raporlama motoru ve dinamik zorluk ayarlama denemeleri mevcut.

Ana sorun icerik eksikligi degil; odak, mimari ayrisma ve guvenilir surumleme eksikligi. Ana deneyim su anda tek buyuk dosyada toplaniyor: `app/(tabs)/index.tsx` (2104 satir). Bu dosya auth, kayit, menu, oyun yonlendirme, skor kaydi ve cizim yuklemeyi birlikte tasiyor.

Merkezi `constants/gameCatalog.ts` olusturuldu ve ana menu vitrini bu katalogdan okuyor (`core`, `secondary`, `story`, `creative`, `music` etiketleri ile). Gunluk 3 oyunluk vitrin akisi eklendi. Ancak `index.tsx` dosyasinin kendisi henuz parcalanmadi; katalog sadece veri kaynagini merkezilestirdi.

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

## Tamamlanan Is Paketi (2026-06-20 itibariyle)

1. ✅ Merkezi `constants/gameCatalog.ts` olusturuldu.
2. ✅ Ana menu verisi bu katalogdan okunuyor.
3. ✅ Katalogda oyunlar `core`, `secondary`, `story`, `creative`, `music` olarak etiketlendi (`experimental` henuz kullanilmiyor).
4. ✅ Gunluk 3 oyunluk vitrin akisi eklendi.
5. ⬜ README hala genel Expo sablon metni icin referans veriyor ama PROJECT_STATUS.md'ye link var; daha fazla guncelleme gerekmiyor.

## Faz 1 - Guvenlik (devam ediyor, 2026-06-20)

- ✅ `app/admin.tsx`: hardcoded admin/12, fatih/123, türker/123 sifreleri koddan kaldirildi. Giris artik `supabase.auth.signInWithPassword` ile yapiliyor, yetki kontrolu yeni `admins` tablosundan okunuyor.
- ✅ `supabase_migrations/fix_rls_and_admins.sql` eklendi ve calistirildi: `admins` tablosu olusturuldu (1 RLS policy).
- ✅ Canli veritabaninda `classes`/`class_students`/`oyun_skorlari`/`profiles`/`teachers` tablolarinin **hicbirinde RLS hic acilmamis** oldugu tespit edildi (`create_teacher_tables.sql` daha once hic calistirilmamis). Bu, ilk varsayilandan daha kotu bir durum.
- ✅ `classes`/`class_students` icin RLS acildi (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`), politikalar `teacher_id = auth.uid()` ile sinirli.
- ⬜ **Bilinçli olarak beklemede:** `oyun_skorlari`, `profiles`, `teachers` hala UNRESTRICTED. Sebep: uygulama kodu (skor kaydi, admin veri cekme) su an oturum jetonu degil sabit anon key ile REST cagrisi yapiyor. Bu tablolarda RLS once acilirsa skor kaydi ve admin paneli kirilir. Once kod, sonra RLS sirasi izlenecek.
- ✅ `app/(tabs)/index.tsx` (skor kaydi, cizim yukleme) ve `app/admin.tsx` (veri cekme, oylama, AI analizi PATCH) kodu refactor edildi: tum REST isteklerinde `Authorization: Bearer <sabit anon key>` yerine `supabase.auth.getSession()`'dan alinan gercek oturum jetonu kullaniliyor (jeton yoksa anon key'e dusuyor, akis kirilmaz). `apikey` header'i degismedi (anon key kalmali). `npx tsc --noEmit` temiz.
- ✅ Test ortaminda dogrulandi: cocuk girisi + skor kaydi calisiyor, admin paneli giris + veri cekme calisiyor.
- ⚠️ **Bulunan ek sorun:** `app/teacher-dashboard.tsx` hic Supabase Auth kullanmiyor (sifre yok, sadece email lookup). Daha once `classes`/`class_students` icin yazilan `teacher_id = auth.uid()` RLS politikasi bu yuzden bu akista her zaman auth.uid() NULL gorup erisimi reddediyor. Kullanici onayiyla: bu ozellik su an aktif kullanilmadigi icin bu durum simdilik birakildi (guvenlik acisindan sorun degil, sadece ozellik calismaz durumda). Ileride teacher-dashboard gercek Supabase Auth'a tasinirsa (admin.tsx'teki gibi) bu kendiliginden duzelir.
- ✅ `oyun_skorlari` ve `profiles` icin RLS acildi (`fix_rls_oyun_skorlari_profiles.sql`): veli kendi email'ine ait kayitlari gorur/ekler, admin tumunu gorur/guncelleyebilir.
- ✅ Yerelde dogrulandi: cocuk girisi + oyun + skor kaydi calisiyor ("Veri başarıyla kaydedildi"), admin paneli giris + veri gorme calisiyor.

## Faz 1 - Tamamlandi (2026-06-20)

Ozet: admin girisi artik Supabase Auth + `admins` tablosu uzerinden; `classes`/`class_students`/`oyun_skorlari`/`profiles`/`admins` tablolarinda RLS acik ve gercek sahiplik kurallarina baglandi; skor kaydi/admin veri cekme kodu oturum jetonu kullaniyor. Bilinen ve kasitli olarak birakilan tek istisna: `teacher-dashboard.tsx` gercek Supabase Auth kullanmadigi icin classes/class_students erisimi su an islevsel degil (aktif kullanilmiyor, ileride duzeltilecek).

Bilinmeyen/iliskisiz konular (Faz 1 disinda, not edildi):
- `EXPO_PUBLIC_GEMINI_API_KEY` Google tarafinda askiya alinmis (suspended) - AI yorum ozelligi calismiyor. Ayrica bu anahtar istemci tarafinda (bundle icinde) acik, bu da kendi basina bir risk.
- TTS (sesli okuma) ozelliginde OpenAI API cagrisi JSON degil HTML donduruyor; sistem otomatik tarayici sesine duserek kullaniciyi etkilemiyor ama konsolda hata birikiyor.

## Faz 2 - Mimari Ayristirma (basladi, 2026-06-20)

- ✅ `app/(tabs)/index.tsx`: kendi Supabase client kurulumu kaldirildi, `lib/supabase.ts`'teki paylasilan client import ediliyor. `npx tsc --noEmit` temiz.
- ℹ️ `app/reset-password.tsx` kendi client'ini koruyor — kasitli fark: `detectSessionInUrl: true` (sifre sifirlama linkindeki token'i URL'den okumak icin gerekli), paylasilan client'ta bu `false`. Bu bir tekrar degil, gercek bir yapilandirma ihtiyaci.
- ✅ State'e bagli olmayan saf yardimci fonksiyonlar (`GAME_CARD_META`, `getCatalogGames`, `getTodayKey`, `createDailyGamePlan`, `slugifyName`, `calculateAgeInMonths`) yeni `lib/menuHelpers.ts` dosyasina tasindi, `index.tsx` bunlari import ediyor. Davranis degismedi, sadece konum. `npx tsc --noEmit` ve `npm run lint` temiz (0 hata). Dosya 2104 -> 1989 satira dustu.
- ⬜ Sirada (daha riskli, kullanici onayi gerekecek): `index.tsx` icindeki auth (girisYap, kayitOl, selectChild) ve skor kaydi (sessizceAnalizEtVeKaydet) mantigini ayri hook/servis dosyalarina cikarmak. Bu, dosyanin her yerinde state referanslarini degistirmeyi gerektirdigi icin daha yuksek risk tasiyor; kullanici "kucuk adimlarla devam et" tercihini belirtti, bu adim simdilik beklemede.

## Bir Sonraki Mantikli Is Paketi

1. `app/(tabs)/index.tsx` icini auth, skor kaydi, vitrin/menu ve oyun yonlendirme olarak ayri dosyalara/hook'lara bol (mimari ayristirma, dosya hala ~2090 satir).
2. `experimental` etiketini kullanima ac veya kataloga gerek yoksa kaldir.
3. `teacher-dashboard.tsx`'i gercek Supabase Auth'a tasi (su an sifre kontrolu yok, classes/class_students RLS'i bu yuzden islevsiz).
4. `EXPO_PUBLIC_GEMINI_API_KEY` askiya alinmasini coz, istemci tarafinda acik olmasi riskini degerlendir.
