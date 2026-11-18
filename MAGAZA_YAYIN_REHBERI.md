# Mağaza yayın rehberi (Google Play + App Store)

Son güncelleme: 2026-11-01. Kararlar: **bireysel hesap**, **uygulama içi satın alma var** (web paketleri mağazadan da satılır, web biraz daha ucuz kalır), **uzun vadede küresel**.

Bu belge iki yarıdan oluşur: kodda **yapılanlar** ve **hesaplarla ilgili senin yapacakların**. Anahtar, parola, ödeme bilgisi gibi şeyleri ben girmem; aşağıda nereye ne yazılacağı var.

---

## 1. Kodda yapılanlar (hepsi testle korunuyor: `lib/storeReadiness.test.ts`)

| Mağaza kuralı | Kodda ne var |
|---|---|
| **Hesap silme** (Apple 5.1.1(v), Google Hesap Silme Politikası) | Uygulama içi: Yetişkin menüsü → *Hesap ve gizlilik* → *Hesabımı sil* (veli ve öğretmen panellerinde de aynı bağlantı). Herkese açık web adresi: **`https://oyun.childhoodtech.com/hesap-sil`** (Google Play Console'daki "Hesap silme bağlantısı" alanına bu girilir). Şifre yeniden istenir; sunucu (`api/delete-account.ts`) çocuk profilini, tüm oyun sonuçlarını, çizim dosyalarını, sınıf kayıtlarını, öğretmen verisini ve Auth hesabını siler. |
| **Ebeveyn kapısı** (Apple 1.3, Google Aile Politikası) | Çarpma sorusu (6–9 arası çarpanlar), 6 seçenek, 2 yanlışta 15 sn bekleme. Mobilde: ödeme ekranına girerken, tüm dış bağlantılarda (gizlilik/şartlar, Minik Müze kaynak sayfaları, abonelik yönetimi), yapay zekâ izni verirken. |
| **Yapay zekâ / ses izni** (Apple 5.1.2(i)) | "Bunu Söyle!" (çocuğun sesi → OpenAI konuşma tanıma) ve gelişim raporu (yaş + oyun sonuçları → OpenAI) için ayrı ayrı, ebeveyn kapısından geçen açık izin ekranı. İzin hesapta saklanır, *Hesap ve gizlilik* ekranından geri alınabilir. Veli raporu isteminden çocuğun **adı çıkarıldı** (öğretmen özetinde zaten yoktu). |
| **Dış satın alma yönlendirmesi yasağı** (Apple 3.1.1) | Mobilde web fiyatı/bağlantısı hiçbir yerde yok; yükseltme düğmeleri uygulama içi ödeme ekranına gider. Haftalık rapordaki "childhoodtech.com" rozeti kaldırıldı. |
| **Ödeme ekranı** | RevenueCat paketlerini Tohum/Filiz/Fidan/Orman/Çınar adlarıyla, **mağazadan gelen yerel fiyatla** gösterir; otomatik yenileme notu, Kullanım Şartları, Gizlilik, "Satın alımları geri yükle", abonelik yönetimi bağlantısı var. Satın alma sonrası çocuk odası paketi yeniler. |
| **iPad** | Kapatıldı (`supportsTablet: false`): iPad ekran görüntüsü gerekmez. |
| **Şifreleme beyanı** | `usesNonExemptEncryption: false` (App Store Connect sorusu hazır gelir). |
| **Android izinleri** | Yalnız mikrofon + ses ayarı. Depolama, üst pencere ve **reklam kimliği (AD_ID)** izinleri engellendi; yedekleme kapalı. |
| **Mikrofon açıklaması** | İngilizce taban + Türkçe yerelleştirme (`assets/native-locales/tr.json`). |
| **Anlık güncelleme** (`expo-updates`) | Kuruldu. Ses/metin/oyun düzeltmeleri mağaza incelemesi beklemeden gider (bkz. Bölüm 5). |
| **İkonlar** | Maskotlu mağaza ikonu (iOS alfa kanalsız tam kare, Android adaptive + tek renk), açılış görseli. Kaynak: `assets/branding/mascot/gulumser.webp`. Beğenmezsen kendi tasarımınla aynı dosya adlarının üzerine yaz. |
| **Android 15/16** | Hedef API 36'da ekran kenardan kenara çizilir; kök çerçeve durum/gezinme çubuğu boşluğunu bırakır. **Gerçek cihazda görülmedi** (Bölüm 6). |
| **RevenueCat webhook** | Yenilenmeyen (bitişsiz) satın alma süresiz erişime dönüşmesin diye sağlamlaştırıldı; mağaza aboneliği bitince web'den alınmış daha uzun süre silinmez. |

---

## 2. Senin yapacakların (sırayla)

### 2.1 Hesaplar
- **Apple Developer Program** (bireysel): yasal adın mağazada satıcı adı olarak görünür. App Store Connect'te yeni uygulama: Bundle ID `com.oyunprojesi.app`, ad "Bilimo", kategori **Eğitim**, yaş derecelendirmesi **4+**. **"Kids" kategorisini seçme** (öneri): o kategori üçüncü tarafa kişisel veri göndermeyi yasaklar; çocuğun sesi OpenAI'a gittiği için sorun çıkarır. Yasal sözleşmelerde *Paid Applications* sözleşmesi + vergi + banka bilgisi tamamlanmadan satın alma çalışmaz.
- **Google Play Console** (bireysel): paket adı `com.oyunprojesi.app`. Bireysel hesapta üretime çıkmadan önce **kapalı testte en az 12 test kullanıcısı, 14 gün kesintisiz** gerekir (bunu başlatmak en uzun bekleme süresi). Ödeme profili + vergi formu.
- **Apple Small Business Program** başvurusu (komisyon %30 yerine %15). Google'da abonelikte %15 zaten geçerli.

### 2.2 Ortam değişkenleri (anahtarları sen girersin)
| Nerede | Değişken | Ne için |
|---|---|---|
| Vercel (Production) | `SUPABASE_SERVICE_ROLE_KEY` | Hesap silme + RevenueCat webhook. Supabase → Settings → API → *service_role*. **Gizli tut**, istemciye gitmez. |
| Vercel | `REVENUECAT_WEBHOOK_SECRET` | Webhook yetkisi (kendin üret, RevenueCat'e de aynısını gir). |
| Vercel (isteğe bağlı) | `REVENUECAT_SECRET_API_KEY` | Hesap silinince RevenueCat'teki müşteri kaydı da silinir. |
| EAS (production, preview, development — 3 ortam) | `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat *Public SDK key* (iOS `appl_…`, Android `goog_…`). Yoksa ödeme ekranı "kullanılamıyor" der, çökmez. |
| EAS | `EXPO_PUBLIC_API_BASE` | `https://oyun.childhoodtech.com` olmalı (zaten var; kontrol et). |

### 2.3 RevenueCat
1. Proje oluştur; iOS ve Android uygulamalarını ekle (mağaza bağlantıları: App Store Connect API anahtarı, Play servis hesabı).
2. **Entitlement'lar** (yazım birebir böyle, küçük harf, Türkçe karakter yok): `tohum`, `filiz`, `fidan`, `orman`, `cinar`.
3. **Offering'ler**: `veli` (Tohum/Filiz/Fidan/Orman ürünleri) ve `ogretmen` (Çınar). Kimlikleri aynen böyle yaz; kod bunları arar.
4. Webhook: URL `https://oyun.childhoodtech.com/api/revenuecat-webhook`, *Authorization header* = `REVENUECAT_WEBHOOK_SECRET` değeri.

- **Sandbox (test) satın almaları** üretimde varsayılan olarak paket açmaz: `api/revenuecat-webhook.ts`, `REVENUECAT_ALLOW_SANDBOX=1` yoksa `environment: SANDBOX` olaylarını yok sayar. Neden: sandbox satın alması iOS/Android sandbox hesabı olan herkes yapabilir; bu olaylar paket açarsa ücretsiz paket açılabilir.
- **Doğru sıra:** Apple ve Google incelemecileri uygulamayı sandbox satın almayla dener. Bayrak İNCELEME BİTENE KADAR Vercel'de `REVENUECAT_ALLOW_SANDBOX=1` olarak açık kalmalı; yoksa incelemecinin satın alması paket açmaz ve inceleme başarısız olabilir. İnceleme onaylandıktan sonra bayrak kaldırılmalı. Bayrak açıkken sandbox hesabı olan herkes sandbox satın almayla paket açabilir; bu süre yalnız inceleme penceresiyle sınırlı tutulmalı. [DOĞRULA: Google Play test satın almalarının RevenueCat'te SANDBOX olarak gelmesi ve incelemecilerin hangi hesapla satın aldığı.]
- Not: `api/revenuecat-webhook.ts` içinde sandbox denetiminin hemen üstündeki yorum ('yayın öncesi kaldırılır') bu sıraya göre eski (doğrusu: inceleme bitene kadar açık, onaydan sonra kaldırılır). Satır numarası değiştiği için yorum metniyle ara; yorumu düzeltmek kod tarafında açık iştir.

### 2.4 Ürünler ve fiyatlar
**Ürün kimliği kuralı** (iOS ve Android'de aynı; paket adı + süre içermeli, ödeme ekranı ve webhook bunu okur):

| Paket | Ürün kimliği | Süre | Web fiyatı (TR / EN) | Mağaza hedefi (web ÷ 0,85) |
|---|---|---|---|---|
| Tohum | `bilimo_tohum_monthly` | 1 ay | ₺399 / $9.99 | ≈ ₺470 / $11.75 |
| Filiz | `bilimo_filiz_3m` | 3 ay | ₺999 / $24.99 | ≈ ₺1.175 / $29.40 |
| Fidan | `bilimo_fidan_6m` | 6 ay | ₺1.749 / $44.99 | ≈ ₺2.060 / $52.90 |
| Orman | `bilimo_orman_yearly` | 12 ay | ₺2.899 / $69.99 | ≈ ₺3.410 / $82.30 |
| Çınar (sınıf) | `bilimo_cinar_monthly` | 1 ay | ₺2.799 / $74.99 | **₺3.299** (karar verildi, bkz. `PRICING.md`) / ≈ $88 |

- Mağaza fiyatı web'den ~%15 yüksek tutulur: komisyon payı kadar, böylece web "bir tık" ucuz kalır ve net gelir eşitlenir. Tabloda en yakın **üst fiyat basamağını** seç (Apple fiyatları sabit basamaklıdır).
- **Küresel**: temel fiyatı **USD**'de gir, Apple/Google'ın otomatik ülke dönüşümünü kullan; **TRY'yi elle** ayarla. Fiyatlar kodda tutulmaz, ödeme ekranı mağazanın verdiği yerel fiyatı gösterir.
- iOS'ta Orman→Tohum aynı **abonelik grubunda** (üst düzey Orman), Çınar ayrı grupta. Android'de her paket ayrı abonelik, tek temel plan.
- Meşe (kurum) mağazada satılmaz: kuruma doğrudan satış (Apple 3.1.3(c)).

### 2.5 Gizlilik beyanları
- Hukuki sayfalardaki **"Ticari unvan / Adres [eklenecek]"** alanlarını doldur (iki mağaza da politika bağlantısını ister).
- Gizlilik politikasına **Bölüm 4'teki ek metni** ekle (OpenAI, RevenueCat, hesap silme; şu an politikada yok ve "çocuklardan doğrudan veri toplamaz" cümlesi web'deki sesle çelişiyor). Ses yalnız web'e özgüdür: mobilde mikrofon kapalı olduğu için mobil beyanlara ses girmez. **Güncel bul-değiştir çiftleri (TR+EN, canlı sayfadan alıntılı) `GIZLILIK_METNI_GUNCELLEME_2026-11-18.md` içindedir**; bu satır ile Bölüm 4 arasında fark varsa o belge geçerlidir.
- **Apple App Privacy** (taslak, kendin doğrula; kategori adları Apple'ın güncel listesine göre [DOĞRULA]). Mobil uygulamada ses toplanmaz: "Bunu Söyle!" (mikrofon) oyunu mobilde kapalıdır (`lib/platformGames.ts`), `app.json` içinde `RECORD_AUDIO` engelli ve `expo-av` `microphonePermission: false`. "Say This!" anlatımı mobil beyanlara girmez (web'e özgüdür).
  - **İletişim bilgisi**: e-posta adresi, ad (veli hesabı). Amaç: uygulama işlevselliği.
  - **Kullanıcı içeriği**: kaydedilen çizimler. Ses YOK (mobilde mikrofon kapalı).
  - **Kullanım verisi**: oyun sonuçları (oyun ilerlemesi). [DOĞRULA: Apple kategorisi "Product Interaction" mı "Gameplay Content" mi.]
  - **Tanılama**: hata/kilitlenme raporları (cihaz modeli, işletim sistemi ve uygulama sürümü, ekran/oyun adı, hata metni, not). Kendi Supabase sunucumuza gider (`supabase_migrations/add_bug_reports.sql`); çocuk adı, e-posta ve kullanıcı kimliği YOK. Kategori: Diagnostics (Crash Data / Other Diagnostic Data) [DOĞRULA].
  - **Satın almalar**: RevenueCat'e veli e-postası (appUserID) ve satın alma kaydı (paket, başlangıç/bitiş). Kategori: Purchases [DOĞRULA]. Hesap kimliği değil e-posta gider.
  - **Tanımlayıcılar**: hesap kimliği (kullanıcıya bağlı). Expo güncelleme hizmetine rastgele kurulum kimliği iletilebilir: Device ID kategorisi gerekip gerekmediği [DOĞRULA: Expo kimliğinin türü ve kapsamı].
  - Hepsi "kullanıcıya bağlı", amaç "uygulama işlevselliği"; **izleme yok**, reklam yok. Mobil `package.json` içinde analitik/çökme SDK'sı görünmüyor (bu kontrol kod taramasıyla yapıldı).
- **Google Data safety** (taslak): Kişisel bilgi (ad, e-posta), Uygulama etkinliği (oyun sonuçları), Uygulama bilgileri ve performansı → Kilitlenme günlükleri/Tanılama (kendi sunucumuz; bkz. PLAY_SURUM_HAZIRLIGI §3), Satın almalar (RevenueCat'e e-posta + satın alma kaydı) [DOĞRULA: Google kategori adları]. Ses dosyaları YOK (mobilde mikrofon kapalı). Şifreli aktarım: evet. **Silme talebi**: evet (uygulama içi + `https://oyun.childhoodtech.com/hesap-sil`).
  - **Güncel ve tam cevaplar `PLAY_CONSOLE_CEVAPLARI.md` içinde** (AI raporu artık Claude/Anthropic, ses OpenAI; analitik/reklam yok). Bu satır eski taslaktır.
- Google **hedef kitle**: 3–5 ve 6–8 yaş seçilirse Aile Politikası uygulanır (mobilde mikrofon kullanılmaz ve ses verisi toplanmaz, bu yüzden Data safety'de ses beyan edilmez; çocuğa yönelik uygulamalarda beyanın gerçek veri akışıyla birebir tutması gerekir [DOĞRULA: Google Aile Politikası beyan gereklilikleri]). IARC anketi: şiddet/satın alma yok → 3+.

### 2.6 İnceleme notları (Apple "App Review Information" ve Google'da aynısı)
Aşağıdaki metni İngilizce yapıştır; demo veli hesabı ve demo öğretmen hesabını sen oluştur (parolayı bana yazma):

> Bilimo is a game-based learning app for preschoolers (ages 3–6), used through a parent's account. Parental gate: a multiplication question appears before the purchase screen, external links and AI permission. In-app purchases: Tohum/Filiz/Fidan/Orman (parent) and Çınar (teacher class plan); the same plans are sold on our website, and the app does not link to it. Account deletion: Parent menu (long-press the gear icon) → Account & privacy → Delete my account. Microphone: not used in the mobile app (the "Say This!" game is closed on mobile and no microphone permission is requested). Error reports: if a game fails or the user taps "Report a problem", the device model, OS and app version, screen/game name and error text are sent to our own server; they contain no child name, e-mail or user ID. Purchases: RevenueCat receives the parent's e-mail address as the app user ID together with the purchase record. The progress report is written by an AI service only after parental permission; the child's name is not sent. Demo accounts: parent …, teacher … .

### 2.7 Mağaza sayfası
Ad, kısa/uzun açıklama, anahtar sözcükler, ekran görüntüleri (iPhone 6,7"/6,5"; Android telefon), öne çıkan görsel (1024×500), destek e-postası/bağlantısı. İstersen metinleri ve ekran görüntüsü planını ben hazırlarım.

---

## 3. Küresel açılış için not
Uygulama içi metinler TR/EN (yeni ekranlar dahil); oyun içi **sesler yalnız Türkçe** ve Maarif kazanımları Türkiye'ye özgü. Yurt dışında açmadan önce: mağaza listesini hedef dillerde yaz, ülke bazlı fiyatı gözden geçir, AB/ABD için **GDPR ve COPPA** (çocuk verisi, ebeveyn onayı, veri işleme sözleşmeleri) hukuk danışmanıyla ayrıca ele alınmalı. Türkiye için: ses/rapor verisini OpenAI'a (ABD) göndermek KVKK m.9 (yurt dışı aktarım) kapsamındadır.

---

## 4. Gizlilik politikasına eklenecek metin (TASLAK — hukuk danışmanı gözden geçirsin)

**Üçüncü taraflar** listesine ekle:
- **OpenAI (ABD)** — Yalnızca ebeveynin ayrıca verdiği izinle: (a) "Bunu Söyle!" oyununda çocuğun söylediği kelimenin ses kaydı konuşma tanıma için; (b) gelişim raporu için çocuğun yaşı (ay) ve oyun sonuçları. Çocuğun adı ve iletişim bilgileri gönderilmez. Ses kaydı tarafımızda saklanmaz; yazıya çevrilen kelime oyun sonucuyla birlikte hesapta tutulur. OpenAI, API üzerinden gönderilen veriyi varsayılan olarak model eğitimi için kullanmadığını belirtir (güncel koşullarını yayından önce doğrulayın). İzin "Hesap ve gizlilik" bölümünden geri alınabilir.
- **RevenueCat, Inc. (ABD)** — Mobil uygulamadaki abonelik satın alımlarını yönetir; hesap e-postası ve satın alma kaydı işlenir.
- **Apple / Google** — Mağaza ödemeleri; kart bilgisi bize ulaşmaz.
- **Vercel Inc.** — Web uygulamasının ve sunucu işlevlerinin barındırılması.

**"Çocuklara Ait Verilerin İşlenmesi"** bölümünde "Bilimo, doğrudan çocuklardan veri toplamaz" cümlesini şöyle düzelt: *"Çocuğun sesi yalnızca 'Bunu Söyle!' oyununda, ebeveynin izniyle, kelimeyi anlamak için kullanılır ve saklanmaz."*

**Yeni bölüm — Hesap ve verilerin silinmesi:** Uygulamada *Hesap ve gizlilik → Hesabımı sil* ya da `https://oyun.childhoodtech.com/hesap-sil` adresinden hesabınızı ve tüm verilerinizi (profil, çocuk bilgileri, oyun sonuçları, çizimler, sınıf kayıtları) kalıcı olarak silebilirsiniz. Giriş yapamıyorsanız admin@childhoodtech.com adresine yazabilirsiniz. Mağaza aboneliği hesap silmekle iptal olmaz; mağazanızdan ayrıca iptal edilmelidir. Yasal saklama yükümlülüğü bulunan kayıtlar mevzuatın gerektirdiği süre saklanır.

---

## 5. Derleme, test ve yayın

```bash
# Test sürümü (APK, dahili dağıtım)
npx eas-cli build --platform android --profile preview
# Mağaza sürümleri
npx eas-cli build --platform android --profile production   # AAB → Play
npx eas-cli build --platform ios --profile production        # → TestFlight / App Store
npx eas-cli submit --platform android   # ve ios
# Anlık güncelleme (yalnız JS/ses/görsel; yerel değişiklik içermeyen)
npx eas-cli update --channel production --environment production --message "ne değişti"
```

- Anlık güncelleme **yalnız aynı `version`** (app.json, şu an 1.0.0) taşıyan kurulumlara gider (`runtimeVersion: appVersion`). Yeni yerel paket/izin/`app.json` değişikliği olursa `version`'ı artır ve yeni mağaza sürümü çıkar.
- `EXPO_PUBLIC_*` değerleri paketin içine **derleme/güncelleme anında** gömülür: `eas update` çalıştırdığın makinede `.env.local` doğru olmalı.
- Boyut: Android'de cihaza inen ~180 MB, Google sınırı 200 MB. Yeni şarkı/hikâye eklemeden önce ölçülmeli (gerekirse Play Asset Delivery).

---

## 6. Açık kararlar ve riskler (sende)
1. **Mağazada otomatik yenilenen abonelik, web'de tek seferlik paket** (karar 2026-11-01: bu şekilde kalsın). Süreler aynı: 1/3/6/12 ay; Apple/Google'ın doğal modeli. İleride web'deki gibi "tek seferlik, süreli" satmak istersen iOS'ta *yenilenmeyen abonelik*, Google'da *ön ödemeli plan* gerekir; webhook bunu da işler (süreyi ürün kimliğinden hesaplar) ama RevenueCat iOS'ta bu ürünlerde bitiş vermediği için sınama gerekir.
2. **Kayıt onayları (YAPILDI, 2026-11-01):** akademik araştırma izni artık **isteğe bağlı** (varsayılan kapalı); zorunlu olan tek kutu "Kullanım Şartları + Gizlilik Politikası + çocuğun bilgilerinin hizmet için işlenmesi". Araştırma izni kayıttan sonra uygulamadan geri çekilemiyor (veritabanı tetikleyicisi `data_consent` alanını kilitliyor, `add_owner_package_write.sql`); şimdilik geri çekme e-postayla. Uygulama içi bir "araştırma iznini geri çek" düğmesi istenirse küçük bir SQL fonksiyonu gerekir.
3. **Android kenardan kenara** (API 36) gerçek cihazda görülmedi: İç testte bir Android 15/16 telefonda ana ekran, oyun çıkış düğmeleri ve alt kısım kontrol edilmeli (Play "ön başlatma raporu" da ekran görüntüsü verir).
4. **iOS** için hiç derleme/cihaz denemesi yapılmadı; ilk TestFlight sürümünde ses, mikrofon izni ve giriş klavyesi kontrol edilmeli.
5. **Satın alma testi**: iOS sandbox hesabı ve Google lisans test hesabıyla gerçek akış denenmeli (kodu cihazsız doğrulayamam).
