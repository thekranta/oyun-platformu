# Google Play Console — hazır cevap kâğıdı (Bilimo)

Son güncelleme: 2026-11-08. Hesap onayı gelince uygulamayı oluştururken bu kâğıttan kopyala. `(doğrula)` işaretli yerleri kendin bir kez gözden geçir; mağaza formlarındaki beyanın sorumluluğu hesap sahibindedir.

Uygulama gerçekleri (cevapların dayanağı): reklam yok, analitik/çökme SDK'sı yok, tek üçüncü taraf SDK `react-native-purchases` (RevenueCat), izinler yalnız ses ayarı (MODIFY_AUDIO_SETTINGS); MİKROFON YOK: "Bunu Söyle!" mobilde kapalı (lib/platformGames.ts, 2026-11-10 kararı: çocuk sesi → OpenAI riski), çocuğun sesi mobilde hiç toplanmaz, reklam kimliği (AD_ID) engelli, hesabı **veli/öğretmen** açar (çocuk kendi hesabını açmaz), çocuğa puan/hata/zorluk sayacı gösterilmez.

---

## 0. Onay beklerken bitenler / senden kalanlar

| Madde | Durum |
|---|---|
| Mağaza görselleri: 512 ikon + 1024×500 öne çıkan görsel | **Hazır:** `store/play/` (üreten betik `scripts/make-play-graphics.mjs`) |
| Telefon ekran görüntüleri (en az 2, en çok 8) | **Sende:** APK'yı telefona kurup 4–6 ekran al (bkz. Bölüm 6) |
| Mağaza metinleri (TR/EN) | **Hazır:** Bölüm 5 |
| Data safety, içerik derecelendirme, hedef kitle cevapları | **Hazır:** Bölüm 2–4 |
| Gizlilik politikası sayfası | **Sende, ENGEL:** canlı sayfada hâlâ `[eklenecek]` yer tutucuları var, OpenAI/Claude/RevenueCat anlatılmıyor. Play bu sayfayı açıp bakar. `pazarlama/gizlilik-guncelleme-ai.html` yapıştırılacak. Şirket yok: "Ticari unvan/Adres" satırları doldurulmaz, kaldırılıp gerçek kişi + e-posta yazılır (dosyada hazır) |
| Güncel üretim AAB | **Yenilenmeli:** son üretim AAB (sürüm kodu 2) 168 commit eski; `expo-updates`, izin engelleri, ebeveyn kapısı yok. Hesap onaylanınca (ya da önce) yeniden derle, bkz. Bölüm 7 |
| Demo hesaplar (veli + öğretmen) | **Sende:** parolayı bana yazma |
| 12 test kullanıcısı | **Sende:** Bölüm 8 (14 günlük sayaç ilk testçi katıldığında değil, 12 kişi olduğunda işler; erken topla) |

---

## 1. Uygulamayı oluştururken

- Ad: **Bilimo** · Varsayılan dil: **Türkçe (tr-TR)** · Uygulama (oyun değil) · **Ücretsiz** (içinde satın alma var)
- Paket adı: `com.oyunprojesi.app`
- Kategori: **Eğitim** · Etiketler: Eğitim, Çocuklar, Okul öncesi (doğrula, listede ne varsa)
- İletişim e-postası: admin@childhoodtech.com (doğrula) · Web sitesi: https://childhoodtech.com
- Gizlilik politikası: `https://childhoodtech.com/gizlilik-politikasi.html`
- Hesap silme bağlantısı: `https://oyun.childhoodtech.com/hesap-sil`

---

## 2. Uygulama içeriği bölümü (sırayla)

| Soru | Cevap |
|---|---|
| Gizlilik politikası | URL yukarıda (sayfa güncellenmeden gönderme) |
| Reklamlar | **Hayır**, uygulama reklam içermiyor |
| Uygulama erişimi | **Bazı kısımlar kısıtlı:** giriş gerekir. Talimat: "Veli hesabıyla giriş yap. Demo veli: … / Demo öğretmen: …" (parolayı konsolda sen yaz) |
| Hedef kitle | **5 yaş ve altı** + **6–8 yaş**. Aile Politikası uygulanır; "çocuklara yönelik" cevabı **Evet** |
| Reklam kimliği | **Hayır** (AD_ID engelli; manifestte yok) |
| Sağlık uygulaması / Finans / Haber / Devlet / COVID | Hepsi **Hayır** |
| Konum / Kişi / Kamera | Kullanılmıyor |
| Hesap silme | Uygulama içi **Evet** (Yetişkin menüsü → Hesap ve gizlilik → Hesabımı sil) + web bağlantısı. Silinen: profil, çocuk bilgisi, oyun sonuçları, çizimler, sınıf kayıtları. Silinmeyen: mağaza aboneliği (mağazadan ayrıca iptal) |
| Uygulama içi satın alma | **Evet** (otomatik yenilenen abonelik: Tohum, Filiz, Fidan, Orman, Çınar) |

---

## 3. İçerik derecelendirme (IARC anketi)

Kategori: **Referans, haber veya eğitim**. Şiddet, korku, cinsellik, kumar, uyuşturucu, küfür: hepsi **Hayır**. Kullanıcılar arası etkileşim/sohbet: **Hayır**. Konum paylaşımı: **Hayır**. Dijital satın alma: **Evet**. Beklenen sonuç: **3+ / PEGI 3 / Herkes**.

---

## 4. Data safety (veri güvenliği) — taslak (doğrula)

**Genel:** Uygulama veri topluyor: **Evet**. Tüm veriler aktarımda şifreli: **Evet** (HTTPS). Kullanıcı silme talep edebilir: **Evet** (bağlantı: hesap-sil). Aile Politikası'na uyum taahhüdü: **Evet**. Bağımsız güvenlik incelemesi: Hayır.

"Paylaşılan" sütunu: bizim adımıza işleyen hizmet sağlayıcılara (Supabase, Vercel, Anthropic, OpenAI, RevenueCat) aktarım Google'ın tanımında **paylaşım sayılmaz**; bu yüzden aşağıda "paylaşılıyor" işaretlenmiyor. Daha temkinli davranıp işaretlemek istersen sorun değil, ama politikayla tutarlı kal.

| Veri türü | Toplanıyor | Zorunlu mu | Amaç | Not |
|---|---|---|---|---|
| E-posta adresi | Evet | Zorunlu | Uygulama işlevi, hesap yönetimi | Veli/öğretmen girişi |
| Ad | Evet | Zorunlu | Uygulama işlevi | Veli adı ve çocuğun adı/rumuzu |
| Kullanıcı kimlikleri | Evet | Zorunlu | Uygulama işlevi, hesap yönetimi | Hesap kimliği (RevenueCat'e de iletilir) |
| Diğer bilgiler | Evet | Zorunlu | Uygulama işlevi | Çocuğun yaşı (ay) |
| Uygulama etkileşimleri | Evet | Zorunlu | Uygulama işlevi | Oyun sonuçları (veli raporu için) |
| Diğer kullanıcı içeriği | Evet | İsteğe bağlı | Uygulama işlevi | Çocuğun çizimleri (mobilde söylenen kelime yok: ses oyunu kapalı) |
| Ses kayıtları | **HAYIR, toplanmıyor** | - | - | Mobil sürümde mikrofon izni ve ses oyunu yok. Ses oyunu geri açılırsa (OpenAI ZDR ya da cihaz içi tanıma çözülünce) bu satır "Evet, isteğe bağlı" olarak yeniden eklenir ve RECORD_AUDIO geri konur |
| Satın alma geçmişi | Evet | İsteğe bağlı | Uygulama işlevi | Abonelik kaydı (RevenueCat) |

Toplanmayanlar: konum, kişiler, fotoğraf/video (kamera yok), takvim, sağlık, finansal kart bilgisi, web gezinme, cihaz kimlikleri/reklam kimliği, çökme günlüğü, tanılama.

---

## 5. Mağaza metinleri

**Kısa açıklama (en çok 80 karakter):**
`3–6 yaş için oyunla öğrenme: sayılar, harfler, renkler, müzik ve daha fazlası`

**Tam açıklama (TR):** GÜNCEL METİN `store/play/tam-aciklama-tr.txt` dosyasındadır (2026-11-10: uyarlanır zorluk, uzman paneli onayı, öğretmen/tahta/Sınıf Bahçesi/kurum eklendi). Aşağıdaki blok eski kısa taslaktır, kullanma.

```
Bilimo, okul öncesi çocuklar (3–6 yaş) için hazırlanmış, ebeveyn ve öğretmenle birlikte kullanılan oyunla öğrenme uygulamasıdır.

Çocuk oynarken sayıları, harfleri, renkleri, şekilleri, örüntüleri, müziği ve çevresini keşfeder. Oyunlar kısa, renkli ve sesli yönergelidir; çocuk okuma bilmeden de oynayabilir.

NELER VAR?
• 150'den fazla oyun: sayı ve işlem, harf ve ses, renk ve şekil, hafıza, örüntü, fen ve doğa, sanat ve müzik
• Sesli yönergeler: her oyun çocuğa Türkçe olarak anlatılır
• Etkileşimli değer hikâyeleri
• Minik Müze: ünlü tablolarla keşif oyunları
• Yaratıcı oyunlar: Sihirli Tuval ile çizim, ritim ve melodi
• Çocuğun düzeyine göre ilerleyen akıllı oyunlar

VELİ PANELİ
Oyun sonuçlarını görün, gelişim alanlarını Türkiye Yüzyılı Maarif Modeli kazanımlarıyla ilişkilendirilmiş bir raporla takip edin. Rapor, yalnızca sizin verdiğiniz izinle hazırlanır.

ÖĞRETMEN VE SINIF
Öğretmenler sınıf oluşturabilir, öğrencileri ekleyebilir, oyun rehberiyle kazanım odaklı etkinlik seçebilir.

GÜVENLİK VE GİZLİLİK
• Reklam yok, çocuğa yönelik izleme yok
• Çocuğa puan, hata sayacı veya yarış baskısı gösterilmez
• Satın alma, dış bağlantı ve yapay zekâ destekli rapor izni ebeveyn kapısının arkasındadır
• Mobil uygulama mikrofon, kamera, konum veya kişi listesi izni istemez
• Hesabınızı ve tüm verilerinizi uygulamadan istediğiniz zaman silebilirsiniz

ABONELİK
10 oyun ücretsizdir. Tohum, Filiz, Fidan ve Orman paketleri ek oyunlara ve veli raporlarına erişim sağlar; Çınar paketi sınıf kullanımı içindir. Abonelikler otomatik yenilenir; Google Play hesabınızdan istediğiniz zaman iptal edebilirsiniz.

Gizlilik politikası: https://childhoodtech.com/gizlilik-politikasi.html
Kullanım şartları: https://childhoodtech.com/kullanim-sartlari.html
```

Not: Katalogda 162 oyun var (mobilde ses oyunu kapalı: 161), bu yüzden metinde "150'den fazla" yazıyor. Ücretsiz oyun sayısı `lib/subscriptionTiers.ts` içindeki `FREE_GAME_IDS` (10 oyun) ile eşleşmeli; ikisi değişirse metni güncelle.

**Release notes (ilk sürüm):** `Bilimo'nun ilk sürümü: yüzü aşkın oyun, sesli yönergeler, veli paneli ve öğretmen sınıf araçları.`

**İngilizce liste (isteğe bağlı):** Uygulama arayüzü TR/EN ama **oyun sesleri yalnız Türkçe**. İngilizce liste açacaksan bunu ilk satırda belirt ("Voice guidance is in Turkish"); aksi hâlde EN kullanıcılar yanlış beklentiyle düşük puan verir. Önerim: ilk sürümde yalnız Türkçe.

---

## 6. Görseller

- **Uygulama simgesi 512×512:** `store/play/icon-512.png`
- **Öne çıkan görsel 1024×500:** `store/play/feature-graphic-1024x500.png`
- **Telefon ekran görüntüleri (2–8 adet, 16:9 ya da 9:16, kenar 320–3840 px):** önerilen sıra: (1) ana ekran/oyun kataloğu, (2) bir sayı oyunu, (3) bir renk/şekil oyunu, (4) hikâye ya da Minik Müze, (5) Sihirli Tuval çizimi, (6) veli paneli raporu. Telefonun ekran görüntüsü (güç + ses kısma) yeterlidir; çocuk adı ve gerçek e-posta görünmesin, demo hesap kullan.
- 7"/10" tablet görseli şart değil (iPad/tablet desteği kapalı değil ama zorunlu da değil).

---

## 7. Yayın derlemesi (hesap onayından sonra, ya da önceden)

```bash
npx eas-cli build --platform android --profile production
```

Çıkan **AAB**'yi Play Console → Test → Kapalı test → Yeni sürüm'e yükle. Abonelik ürünleri Play'de **yalnız faturalama kütüphanesini içeren bir AAB yüklendikten sonra** oluşturulabilir; yani abonelik kurulumu bu yüklemeden sonra başlar.

Derlemeden önce kontrol:
- EAS production ortamında `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` **yok** (şu an yalnız API_BASE ve Supabase var). Yokluğu çökertmez ama ödeme ekranı "kullanılamıyor" der; RevenueCat Play bağlantısı kurulunca ekle ve yeniden derle.
- `app.json` `version` 1.0.0 kalır; `autoIncrement` sürüm kodunu artırır.

---

## 8. Kapalı test (14 gün × 12 kişi)

Bireysel hesapta üretime çıkmak için en az **12 kişi aynı anda katılmış** ve **14 gün kesintisiz** testte olmalı. Konsolda: Test → Kapalı test → Test kullanıcıları → e-posta listesi (ya da Google Grubu) → "katılım bağlantısı"nı testçilere gönder; her testçi bağlantıdan **katılmalı** ve uygulamayı Play'den indirmeli. İçlerinden biri çıkarsa sayı 12'nin altına düşer, 14 günlük sayaç bozulur: **15–18 kişi topla.**

Testçilere gönderilecek mesaj:

> Merhaba! Bilimo adlı çocuk öğrenme oyunlarının Google Play kapalı testine davetlisin. 1) Bu bağlantıya tıkla ve "Test kullanıcısı ol"u seç: [bağlantı]. 2) Play Store'dan uygulamayı indir. 3) 14 gün boyunca kurulu bırak, ara sıra aç. Sorun ya da fikrin olursa bana yaz. Teşekkürler!

Test sonunda Play "üretim erişimi" başvurusunda test sürecini sorar (geri bildirim, yapılan düzeltmeler). Kısa bir not tut: kim ne bildirdi, ne düzelttin.
