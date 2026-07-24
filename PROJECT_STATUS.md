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

## Bilinen Hata: Cizim resmi web'de tam kaydedilmiyor (2026-06-21) — ✅ DUZELTILDI

- **Belirti:** Cocuk "Hayal Defteri" (YaraticiCizim) ile cizim yapip kaydedince, admin/ogretmen panelinde cizim goruntusu gelmiyor / eksik goruniyordu.
- **Kok neden:** `components/YaraticiCizim.tsx` cizimin tam PNG'sini `captureRef` (react-native-view-shot) ile yakaliyordu. Bu fonksiyon web'de `findNodeHandle` kullaniyor ve web'de DESTEKLENMIYOR ("findNodeHandle is not supported on web"). Resim uretilemeyince sadece vektor verisi kaydediliyordu.
- **Cozum (2026-06-21):** Yakalama platforma gore ayrildi. Web'de `html-to-image`'in `toPng`'si `canvasRef` DOM dugumune uygulaniyor (dinamik import, yalnizca web'de); native'de `captureRef` korundu. Canvas'in kendi arka plani `#fffef9` oldugu icin export'a `backgroundColor: '#fffef9'` verildi. `html-to-image` bagimliligi eklendi. tsc temiz, yeni lint uyarisi yok. `SihirliTuval.tsx` kontrol edildi — cizim yakalamiyor, etkilenmiyor.
- **Not:** Admin/ogretmen panelinin cizim resmini gercekten render edip etmedigi (URL'yi `<Image>` ile gosterme) ayrica dogrulanmali; bu fix resmin URETILIP KAYDEDILMESINI sagliyor.

## Faz 2 - Mimari Ayristirma (basladi, 2026-06-20)

- ✅ `app/(tabs)/index.tsx`: kendi Supabase client kurulumu kaldirildi, `lib/supabase.ts`'teki paylasilan client import ediliyor. `npx tsc --noEmit` temiz.
- ℹ️ `app/reset-password.tsx` kendi client'ini koruyor — kasitli fark: `detectSessionInUrl: true` (sifre sifirlama linkindeki token'i URL'den okumak icin gerekli), paylasilan client'ta bu `false`. Bu bir tekrar degil, gercek bir yapilandirma ihtiyaci.
- ✅ State'e bagli olmayan saf yardimci fonksiyonlar (`GAME_CARD_META`, `getCatalogGames`, `getTodayKey`, `createDailyGamePlan`, `slugifyName`, `calculateAgeInMonths`) yeni `lib/menuHelpers.ts` dosyasina tasindi, `index.tsx` bunlari import ediyor. Davranis degismedi, sadece konum. `npx tsc --noEmit` ve `npm run lint` temiz (0 hata). Dosya 2104 -> 1989 satira dustu.
- ✅ Skor kaydi mantigi (`sessizceAnalizEtVeKaydet`, ~170 satir) yeni `services/gameResults.ts` dosyasina `saveGameResult()` olarak tasindi. Fonksiyon UI state'inden bagimsiz; `ad`/`yas`/`email` parametre olarak geciyor, `setYukleniyor` cagiran tarafta kaldi. Cizim yukleme + email/cizim sutunu fallback mantigi birebir korundu. Kullanilmayan import'lar (`FileSystem`, `slugifyName`, `SUPABASE_URL/KEY`, `DRAWING_BUCKET`) temizlendi. `index.tsx` 1990 -> 1837 satir. `npx tsc --noEmit` temiz, yeni lint uyarisi yok.
- ✅ Auth mantigi yeni `hooks/useAuth.ts` hook'una tasindi: 4 fonksiyon (girisYap, sifremiUnuttum, selectChild, kayitOl) + tum auth'a ozel state (password, isLoggingIn, focusedInput, kayit form state'leri, cocuk secimi, turnstile). Oturum kimligi (ad/yas/email/asama) ve toast component'te kaldi; hook bunlari `useAuth({ email, setEmail, setAd, setYas, setAsama, showToast, resumeAfterInteraction })` ile aliyor. Davranis birebir korundu. `index.tsx` 1837 -> 1655 satir; oturum basindan beri 1990 -> 1655 (-335). Toplam lint uyarisi 130 -> 124 (6 olu degisken temizlendi), tsc temiz.
- ℹ️ Faz 2 mimari ayristirma ozeti: skor kaydi `services/gameResults.ts`, auth `hooks/useAuth.ts`, menu yardimcilari `lib/menuHelpers.ts`, paylasilan Supabase client `lib/supabase.ts`. `index.tsx` artik agirlikli olarak menu/oyun yonlendirme + ekran render. Bir sonraki olasi adim: menu/vitrin render'ini ayri bir bilesene cikarmak (dusuk oncelik, dosya artik yonetilebilir boyutta).

## Bir Sonraki Mantikli Is Paketi

1. ✅ `app/(tabs)/index.tsx` mimari ayristirma yapildi (skor kaydi -> services/gameResults.ts, auth -> hooks/useAuth.ts). Dosya 1990 -> 1655 satir. Opsiyonel kalan: menu/vitrin render'ini ayri bilesene almak (dusuk oncelik).
2. ✅ `experimental` etiketi kaldirildi: hicbir oyun kullanmadigi icin `GameCatalogStatus` union'indan cikarildi; ayrica kullanilmayan `getGamesByStatus` fonksiyonu silindi. tsc temiz, yeni lint uyarisi yok.
3. ✅ `teacher-dashboard.tsx` gercek Supabase Auth'a tasindi (asagida Faz 3).
4. ✅ Gemini anahtari sunucu proxy'sine tasindi (asagida Faz 4).

## Faz 4 - Gemini Anahtari Sunucu Proxy'si (2026-06-21)

- ✅ `api/gemini-analyze.ts` serverless proxy eklendi: `{ prompt, generationConfig? }` alir, sunucu-tarafi `GEMINI_API_KEY` ile Gemini'yi cagirir (model fallback: gemini-2.0-flash/1.5-flash/1.5-pro/pro), `{ text }` doner. Anahtar istemciye HIC gitmez.
- ✅ `services/geminiClient.ts` eklendi: istemci yardimcisi `requestGeminiAnalysis(prompt, generationConfig?)` -> `/api/gemini-analyze`'a POST.
- ✅ Uc istemci dosyasi Google'a dogrudan cagriyi birakip proxy'yi kullaniyor: `app/admin.tsx` (analyzeGame), `components/TeacherDashboard.tsx` (analyzeScore), `components/VeliDashboard.tsx` (analyzeWithGemini). Tum `GEMINI_API_KEY` istemci sabitleri ve guard'lari kaldirildi. `grep` ile dogrulandi: app/components icinde artik ne `GEMINI_API_KEY` ne de `generativelanguage` cagrisi var.
- ✅ `api/gemini-tts.ts` sunucu anahtarini tercih edecek sekilde guncellendi (`GEMINI_API_KEY || EXPO_PUBLIC_...`).
- ⬜ **Kullanici aksiyonu (gerekli):** (1) Google'dan YENI (askiya alinmamis) bir Gemini anahtari al. (2) Vercel > Project Settings > Environment Variables: `GEMINI_API_KEY` ekle (**`EXPO_PUBLIC_` oneki OLMADAN**). (3) Eski `EXPO_PUBLIC_GEMINI_API_KEY`'i sil. (4) Redeploy. Bu yapilana kadar AI ozellikleri calismaz ama guvenlik acigi (anahtarin bundle'da acik olmasi) bu deploy ile kapanir.
- ℹ️ Not: TTS (`api/tts.ts` / `gemini-tts.ts`) zaten serverless'ti; bu degisiklik AI metin analizini de ayni guvenli desene tasidi. tsc temiz, yeni lint uyarisi yok.

## Faz 3 - Ogretmen Paneli Auth (2026-06-21)

- ✅ `app/teacher-dashboard.tsx`: sifresiz email-lookup giris kaldirildi. Giris artik `supabase.auth.signInWithPassword`, kayit `supabase.auth.signUp` + `teachers` tablosuna `user_id` ile insert. Giris/kayit formlarina sifre alani eklendi (kayitta min 6 karakter). `teacherId` olarak artik **auth kullanici UUID'si** geciyor (eskiden teachers satir id'si); bu sayede `classes.teacher_id = auth.uid()` RLS politikasi calisiyor. Kullanilmayan `SUPABASE_URL/KEY` sabitleri kaldirildi.
- ✅ `components/TeacherDashboard.tsx`: tum REST cagrilarinda (`classes`, `class_students`, `profiles`, `oyun_skorlari` okuma/yazma/silme) `Authorization: Bearer <anon key>` yerine `getSessionToken()` ile oturum jetonu kullaniliyor (jeton yoksa anon key fallback). `apikey` anon key kaldi. AI analizi Gemini cagrisi degismedi (Faz 4 konusu).
- ✅ `supabase_migrations/fix_teacher_auth.sql` yazildi (**kullanici Supabase SQL Editor'da calistirmali**): test verisini temizler; `teachers.user_id` ekler + unique index; teachers RLS (self read/insert/update); `profiles` icin "ogretmen tum ogrenci profillerini okuyabilir" politikasi (ogrenci ekleme aramasi icin gerekli); `oyun_skorlari` icin "ogretmen yalnizca kendi sinifindaki ogrencilerin skorlarini okur" politikasi.
- ℹ️ Tasarim notu: profiles okumasi tum ogretmenlere acik (ogrenci eklerken email aramasi sinifa eklemeden once profili gormeyi gerektiriyor); oyun_skorlari ise sinif uyeligine sinirli (daha hassas veri). classes/class_students RLS zaten Faz 1'de teacher_id = auth.uid() ile kuruldu.
- ✅ Canli test (2026-06-21): yeni ogretmen kaydi + giris + sinif olusturma + ogrenci ekleme + ogrenci skorlarini gorme calisiyor. Test sirasinda iki Supabase ayar/sema sorunu cikti ve cozuldu: (1) "Allow new users to sign up" kapaliydi + "Confirm email" aciktti -> kayit sirasinda session olusmuyordu; ikisi de duzeltildi (signups acik, confirm email kapali). (2) `classes.teacher_id` FK'si `teachers(id)`'ye bagliydi, `auth.users(id)`'ye remap edildi (yoksa sinif olusturma 409 veriyordu, bkz. fix_teacher_auth.sql adim 5).
