# İyzico Web Ödemesi — Kurulum ve Test Rehberi

Bu belge, web'de (oyun.childhoodtech.com) İyzico ile tek seferlik veli paketi satışının nasıl çalıştığını, canlıya
almadan önce neyin yapılması gerektiğini ve nasıl test edileceğini anlatır. Kapsam: Tohum, Filiz, Fidan, Orman.
Çınar ve kurum paketleri bu akışın dışındadır (elle atanmaya devam eder).

Değerler (API anahtarları, gizli anahtar, veritabanı şifresi) bu belgede YAZMAZ. Yalnız ortam değişkenlerinin adları geçer.

---

## 1. Uçtan uca akış

1. Veli web'de `/odeme` sayfasına gelir (yalnız web; mobilde sayfa çizilmez, ana sayfaya yönlendirilir). Giriş yapmış olmalıdır.
2. Paket seçer, alıcı bilgilerini girer (ad, soyad, telefon, şehir, adres; TCKN isteğe bağlı), sözleşme kutusunu onaylar.
3. Tarayıcı `POST /api/iyzico-baslat` çağırır (Bearer jeton). Sunucu e-postayı jetondan alır, fiyatı kendi tablosundan
   (`api/_lib/webPaketler.ts`) belirler, `web_siparisleri` tablosuna `olusturuldu` kaydı açar, İyzico Checkout Form'u başlatır
   ve jetonu siparişe yazar (`beklemede`).
4. Tarayıcı İyzico'nun barındırdığı ödeme sayfasına gider. Kart bilgisi Bilimo sunucularından hiç geçmez.
5. Ödeme bitince İyzico tarayıcıyı `POST /api/iyzico-donus` adresine gönderir (jeton ile). Sunucu jetonu siparişteki jetonla
   eşleştirir, sonucu İyzico'dan kendi anahtarımızla sorgular ve yalnız tüm kontroller tutarsa (durum SUCCESS, imza,
   sipariş kimliği, TRY, tutar, fraud = 1) paketi açar. Sonra 303 ile `/odeme-sonuc?durum=...&siparis=...` sayfasına döner.
6. Sonuç sayfası `GET /api/iyzico-durum` ile sonucu sunucudan sorar (URL'deki `durum` yalnız ipucudur). Sipariş kesinleşene
   kadar yaklaşık 10 kez, 3 sn aralıkla sorar. Başarılıysa paket ve bitiş tarihi gösterilir.
7. Paket yazımı yalnız sunucuda, `service_role` ile yapılır: `profiles.subscription_tier`, `package_started_at`,
   `package_expires_at`. Aynı paket hâlâ geçerliyse bitiş tarihi üzerine eklenir (uzatma); daha yüksek paket varsa
   daha düşük paket satın alınamaz (409, ödeme başlamadan).

Sipariş durumları: `olusturuldu` → `beklemede` → `atama_bekliyor` (para alındı, paket henüz yazılamadı) → `odendi`;
ya da `basarisiz`.

---

## 2. Kullanıcının yapacakları (SIRAYLA)

### 2.1 Veritabanı (Supabase SQL Editor, canlı proje)

**Adım 1 — önce:** `supabase_migrations/fix_lock_tier_service_role.sql`

- Ne yapar: `lock_tier_columns()` tetikleyicisine `service_role` istisnası ekler. Bu olmadan sunucu paketi yazar ama
  tetikleyici geri alır; sistem bunu "atama_bekliyor" olarak yakalar ve para alınmış ama paket açılmamış olur.
- Çalıştırmadan önce mevcut gövdeyi kontrol edin (dosyanın başındaki yorumda belirtilen sorgu). Farklıysa çalıştırmadan
  önce geliştiriciye haber verin.
- Doğrulama:
  ```sql
  select pg_get_functiondef('lock_tier_columns'::regproc);
  -- çıktıda 'service_role' geçmeli
  ```
- Geri alma: `supabase_migrations/fix_lock_tier_service_role_rollback.sql`

**Adım 2 — sonra:** `supabase_migrations/add_web_siparisleri.sql`

- Ne yapar: `web_siparisleri` tablosunu, indeksleri ve RLS'yi kurar. RLS açık ve hiç politika yoktur; yalnız sunucu
  (service_role) erişir. Alıcının adı, telefonu, TCKN'si ve adresi bu tabloya yazılmaz.
- Doğrulama (dosyanın sonundaki sorgular):
  ```sql
  select relrowsecurity from pg_class where oid = 'public.web_siparisleri'::regclass;   -- true
  select count(*) from pg_policies where schemaname = 'public' and tablename = 'web_siparisleri';  -- 0
  select grantee, privilege_type from information_schema.role_table_grants
   where table_name = 'web_siparisleri';   -- anon / authenticated satırı OLMAMALI
  ```
- Geri alma: `supabase_migrations/add_web_siparisleri_rollback.sql` (önce kayıtları dışa aktarın; muhasebe kaydıdır).

### 2.2 İyzico hesabı

- Merchant panelinde **sandbox** (test) ortamı için API anahtarı ve gizli anahtar alın (Settings > API anahtarları).
- Canlıya geçerken canlı (production) anahtarlarını ayrıca alın. Sandbox ve canlı anahtarları karıştırmayın.

### 2.3 Vercel ortam değişkenleri

Değerleri yalnız Vercel panelinde girin; belgeye, koda veya sohbete yazmayın.

| Ad | Ne için | Not |
|---|---|---|
| `IYZICO_API_KEY` | İyzico API anahtarı | Zorunlu |
| `IYZICO_SECRET_KEY` | İyzico gizli anahtarı | Zorunlu, yalnız sunucu |
| `IYZICO_BASE_URL` | İyzico taban adresi | Sandbox: `https://sandbox-api.iyzipay.com`. Canlı: `https://api.iyzipay.com`. Üretimde açıkça yazın (boşsa sandbox varsayılır ve üretimde sandbox engellenir) |
| `SITE_URL` | Geri dönüş ve sonuç adresinin tabanı | `https://oyun.childhoodtech.com` (yalnız https kökü; değilse varsayılan kullanılır) |
| `SUPABASE_SERVICE_ROLE_KEY` | Paket yazımı | Zorunlu. Yoksa ödeme 503 döner |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase adresi | Uygulamada zaten var; sunucu da bunu kullanır |
| `IYZICO_SANDBOX_EPOSTALAR` | Sandbox'ta ödeme yapabilecek deneme e-postaları (virgülle) | Önizleme (preview) ve üretim dağıtımında sandbox açıksa zorunlu. Boşsa kimse başlatamaz (503) |
| `IYZICO_ALLOW_SANDBOX` | `1` yapılırsa üretimde sandbox'a izin verir | Canlıda SAKIN `1` yapmayın |
| `IYZICO_IMZA_DOGRULAMA` | `kapali` yapılırsa sandbox yanıt imzasını atlar | Yalnız sandbox'ta etkili; yalnız sandbox imza formülü tutmazsa geçici olarak; canlıda yok sayılır |

Sandbox'ı test amaçlı önizlemede kullanacaksanız `IYZICO_SANDBOX_EPOSTALAR` içine yalnız kendi test hesabınızı yazın.

### 2.4 Yeniden dağıtım

- Ortam değişkenlerini ekledikten sonra Vercel'de yeniden dağıtım (redeploy) yapın. Değişkenler yalnız yeni dağıtımda
  devreye girer.
- Dağıtım sonrası `/api/iyzico-durum` adresine tarayıcıdan GET atıldığında 401 (giriş gerekli) dönmesi, uç noktanın
  canlı olduğunun basit kanıtıdır.

### 2.5 Yapılması gereken kod kararı (geliştirici)

- `lib/webOdeme.ts` içindeki `MESAFELI_SATIS_URL` şu an BOŞTUR. Boşken `/odeme` sayfasında ödeme düğmesi KAPALIDIR
  (veli sözleşmeyi okuyamayacağı için onaylatılmaz). Sözleşme sayfası yayına girince https adresi buraya yazılmalıdır.
- `/odeme` sayfasına web arayüzünden giden bir bağlantı henüz yoktur; sayfaya ulaşmak için doğrudan adres gerekir.
  Yayına açmadan önce girişin nereden yapılacağına karar verilmelidir (bkz. bölüm 5).

---

## 3. Sandbox test senaryoları

Ön koşul: Sandbox anahtarları ve `IYZICO_BASE_URL=https://sandbox-api.iyzipay.com` tanımlı; `MESAFELI_SATIS_URL` geçici
olarak test için dolu (geliştirici ile birlikte); test e-postası sandbox listesinde (önizlemede).

Test kartı: İyzico'nun sandbox dokümanında yayımlanan test kart numaralarını kullanın (güncel numaralar için
İyzico dokümantasyonuna bakın; bu belgeye numara yazılmamıştır). Son kullanma tarihi ve CVC için belgedeki değerler
geçerlidir.

Her senaryodan sonra Supabase'de şu sorguyu çalıştırın (e-postayı kendi test hesabınıza göre değiştirin):

```sql
select id, paket, durum, tutar_kurus, sure_ay, iyzico_payment_id, atanan_bitis, hata_nedeni, olusturma_zamani
  from web_siparisleri
 where email = '<test e-posta>'
 order by olusturma_zamani desc
 limit 5;

select email, subscription_tier, package_started_at, package_expires_at
  from profiles
 where email = '<test e-posta>';
```

| # | Senaryo | Beklenen sonuç | Kontrol |
|---|---|---|---|
| 1 | Test kartı ile **başarılı** ödeme (Tohum, sıfır paket) | Sonuç sayfası "başarılı" + Tohum + bitiş (bugün + 1 ay). Sipariş `odendi`, `iyzico_payment_id` dolu, `odenen_kurus = 39900` | İlk sorgu: `durum = odendi`. İkinci sorgu: `subscription_tier = tohum`, `package_expires_at` ≈ 1 ay sonra |
| 2 | **Başarısız** ödeme (İyzico'nun belgesindeki başarısız test kartı) | Sonuç sayfası "başarısız" + "tekrar dene" düğmesi. Paket DEĞİŞMEZ | Sipariş `basarisiz`, `hata_nedeni` dolu (örn. `odeme_basarisiz`). `profiles` aynı kalır |
| 3 | **Ödeme sonrası tarayıcıyı kapatma** (ödeme başarılı, dönüş sayfası hiç açılmadı) | Sipariş önce `beklemede` kalır. Veli sonra giriş yapıp `/odeme-sonuc?siparis=<id>` açarsa sunucu İyzico'dan sorgular ve `odendi` yapar | Kapatmadan sonra sorgu: `durum = beklemede`. Sonuç sayfası açıldıktan sonra: `odendi`, paket yazılmış. DİKKAT: bu kurtarma yalnız sayfa açılınca olur (bkz. bölüm 6) |
| 4 | **Aynı paketi ikinci kez** almak (Tohum aktifken Tohum) | Ödeme başlar, başarılı olursa bitiş tarihi ÜZERİNE 1 ay eklenir (kısalmaz). Örn. bitiş 19 Aralık ise 19 Ocak olur | Önce ve sonra `package_expires_at` karşılaştırın; fark ≈ 1 ay. İkinci `iyzico_payment_id` ayrı olmalı |
| 5 | **Daha yüksek paket varken düşük paket** (Fidan aktifken Tohum) | Ödeme BAŞLAMAZ: "daha yüksek paket var" (409). Sipariş de oluşmaz | Sorgu: bu e-posta için yeni `web_siparisleri` satırı OLMAMALI. Tarayıcıda 409 `daha_yuksek_paket_var` |
| 6 | Sandbox listesinde olmayan bir e-posta ile (önizlemede) ödeme başlatmak | 503 `odeme_yapilandirilmadi`; sipariş oluşmaz | Yeni satır yok |
| 7 | Giriş yapmadan `/odeme` ve ödeme düğmesi | Giriş isteği (401). Sipariş oluşmaz | Yeni satır yok |
| 8 | Alıcı formunda geçersiz TCKN (örn. 0 ile başlayan) | Form alanı kırmızı; istek hiç gitmez. Sunucuya gelirse 400 `gecersiz_alici` | Yeni satır yok |

İsteğe bağlı: Tarayıcı sekmesini ödeme sayfasındayken kapatıp (ödeme yapılmadan) bir süre sonra durum sorgusu:
sipariş `beklemede` kalır, paket açılmaz. Bu, veli henüz ödeme yapmadıysa beklenen davranıştır.

---

## 4. Canlıya geçiş kontrol listesi

- [ ] `fix_lock_tier_service_role.sql` canlıda çalıştı; `pg_get_functiondef` çıktısında `service_role` var.
- [ ] `add_web_siparisleri.sql` canlıda çalıştı; üç doğrulama sorgusu beklenen sonucu verdi.
- [ ] Sandbox senaryoları 1-8 hepsi beklenen sonuçta (bölüm 3).
- [ ] Canlı İyzico anahtarları Vercel'de (production ortamı) tanımlı; sandbox anahtarları production'dan çıkarıldı.
- [ ] `IYZICO_BASE_URL=https://api.iyzipay.com` production için açıkça yazıldı.
- [ ] `IYZICO_ALLOW_SANDBOX` production'da tanımlı DEĞİL (ya da `1` değil).
- [ ] `SITE_URL=https://oyun.childhoodtech.com`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` production'da tanımlı.
- [ ] `MESAFELI_SATIS_URL` gerçek sözleşme sayfasına yazıldı (bölüm 5, hukuki karar).
- [ ] Gerçek ama düşük tutarlı bir deneme: en küçük paket (Tohum) ile kendi kartınızla alın, paketin açıldığını ve
      `web_siparisleri` kaydını kontrol edin. Sonra iade yolunu deneyin (aşağıda).
- [ ] İade yolu anlaşıldı (aşağıda). İade otomatik DEĞİL.
- [ ] Sözleşme metinleri, fatura süreci ve TCKN kararı (bölüm 5) yazılı olarak sonuçlandı.

**İade yolu (bugün):** İade OTOMATİK değildir. Akış şöyledir:
1. İyzico Merchant panelinden ödemeyi iade edin (`iyzico_payment_id` ile bulun). Tam iade ve paket iadesi
   kararını siz verin.
2. Paketi geri almak için owner paneli üzerinden veliye elle atama yapın (paket kodunu ve bitişi düşürün/kaldırın).
   Bu adım kod tarafında otomatik değildir.
3. `web_siparisleri` satırını elle güncellemek isterseniz (kayıt kalsın, bilgi notu düşün) yalnız `hata_nedeni` ya da
   yeni bir not alanına yazın; `durum`'u `odendi` olarak bırakmak muhasebe için daha doğru olabilir. Bu kararı
   mali müşavirle birlikte verin.

Not: Ödeme `odendi` olduktan sonra webhook yoktur; İyzico'daki iade sisteme kendiliğinden yansımaz.

---

## 5. Hukuki ve mali karar noktaları (kullanıcı kararı; kod bunları otomatik çözmez)

1. **Mesafeli satış sözleşmesi ve ön bilgilendirme sayfası:** Adresi hazır mı? Kodda `MESAFELI_SATIS_URL` (lib/webOdeme.ts)
   boştur ve boşken ödeme kapalıdır. Sayfa yayınlanınca adres yazılmalıdır.
2. **Fatura (e-arşiv):** Kodda fatura üretimi YOKTUR. Ödeme sonrası e-arşiv fatura nasıl kesilecek (İyzico panelinden mi,
   başka bir sistemden mi, elle mi)? Kararı ve süreci netleştirin. Fatura alıcı bilgisi (TCKN/VKN) bu sürece bağlıdır.
3. **KDV dahil fiyat varsayımı:** Fiyatlar (₺399, ₺999, ₺1.749, ₺2.899) KDV dahil varsayılıyor. Ekranda "KDV dahil" YAZILMIYOR
   (lib/webOdeme.ts içinde onay bekleniyor). Mali müşavir onayı gerekir.
4. **TCKN toplama:** Kod TCKN'yi isteğe bağlı bırakıyor. TCKN girilmezse İyzico'ya yer tutucu bir numara
   (`11111111111`, api/iyzico-baslat.ts) gönderiliyor. Bu numaranın üretimde kabul edilip edilmediği İyzico tarafından
   teyit edilmemiştir (kod notu: İyzico entegrasyon ekibine sorulmalı). Seçenekler: TCKN'yi zorunlu yapmak, ya da
   İyzico'nun kabul ettiği alternatifi teyit etmek. Karar gerekir.
5. **İade ve cayma politikası:** Dijital hizmet için cayma hakkı ve iade koşulları (kullanılmış paket, süre) yazılı
   olarak tanımlanmalı. İade süreci (bölüm 4) bu politikaya uymalı.
6. **Çocuklara yönelik hizmette ebeveyn sorumluluğu metni:** Satın alan veli olduğundan ödeme ve veri sorumluluğu
   metninde açıkça yer almalı. Hukuki metni onaylayın.
7. **Kapsam dışı kalanlar:** Çınar paketi ve kurum paketleri web'de satılmaz (elle atanır). Kardeş indirimi bu sürümde
   YOKTUR. Bunların web satışına eklenmesi ayrı bir karardır.
8. **Yenilenen abonelik:** Bu akış TEK SEFERLİK ödemedir. Otomatik yenilenen (iyzico abonelik) ödeme ayrı bir başvuru
   ve ayrı bir geliştirme gerektirir; şu an yoktur.
9. **Veri ve KVKK metni:** Ödeme verisinin (ad, telefon, adres, TCKN'nin İyzico'ya iletilmesi) gizlilik politikasında
   açıklandığını doğrulayın. Kod, alıcı verisini bu tabloya yazmaz; metin de bu duruma uygun olmalıdır.

---

## 6. Bilinen sınırlar

- **Tarayıcıya bağımlı kurtarma:** Sipariş, veli ödeme sonrası sonuç sayfasını açmazsa `beklemede` kalır. Arka planda
  çalışan bir tarama ya da cron işi YOKTUR. Kurtarma yalnız veli sonuç sayfasını açınca (ya da durum uç noktası
  çağrılınca) olur. Bu yüzden düzenli olarak bekleyen siparişleri kontrol edin:
  ```sql
  select id, email, paket, durum, iyzico_payment_id, olusturma_zamani
    from web_siparisleri
   where durum in ('beklemede', 'atama_bekliyor')
   order by olusturma_zamani;
  ```
- **Webhook yok:** İyzico'dan sunucuya kendiliğinden bildirim gelmez. Yalnız tarayıcı dönüşü ve sorgu ile işlenir.
- **İade otomasyonu yok:** İade paketi geri almaz. Bölüm 4'teki elle süreç uygulanır.
- **Hız sınırı bellek içidir:** Ödeme başlatma (dakikada e-posta başına 5) ve ipucusuz geri dönüş sınırı her sunucusuz
  örnekte ayrı sayılır. Amaç kazara çift tıklamayı kesmektir, tam koruma değildir. Asıl koruma veritabanındaki tekil
  kısıtlar (`iyzico_payment_id`, `token`) ve sipariş durumu kontrolüdür.
- **`atama_bekliyor` durumu:** Para alındı ama paket yazılamadıysa (örn. `fix_lock_tier_service_role.sql` eksikken) sipariş
  bu durumda kalır ve Vercel loglarında "PARA ALINDI AMA PAKET ACILMADI" görünür. Bu durumda önce veritabanı düzeltilir,
  sonra sonuç sayfası yenilenir; paket otomatik açılır.
- **Ödeme başlatma girişi:** `/odeme` sayfasına web arayüzünden bağlantı henüz yoktur (bölüm 2.5).
- **Kayıt yönetimi:** Sipariş tablosu muhasebe kaydıdır; silmeyin, dışa aktarıp arşivleyin.
- **Sandbox imza formülü:** Yanıt imzası formülü sandbox'ta tutmazsa `IYZICO_IMZA_DOGRULAMA=kapali` geçici olarak
  kullanılabilir; bu yalnız sandbox içindir ve canlıda imza her zaman denetlenir.
