# 🔊 Sesli Okuma (TTS) Yol Haritası

**Durum:** Şu an seslendirme çalışmıyor — `/api/tts` proxy'si hazır ama geçerli/faturalı bir
OpenAI anahtarı yok. Oyunlar ve hikayeler **ses olmadan da** çalışacak şekilde tasarlandı
(görsel + metin), ses gelince kendiliğinden devreye girecek. Bu belge, kalıcı çözümü
**ilerleyen zamanda** hayata geçirmek için seçenekleri ve önerilen planı içerir.

---

## Neyin sesli olması gerekiyor?

| Tür | Örnek | Metin sabit mi? |
|-----|-------|-----------------|
| Oyun yönergeleri | "Mutlu yüzü bul!", "Kırmızı sepeti seç" | ✅ Sabit (sayılı) |
| Duygu/renk/zıt adları | "Mutlu", "Kırmızı", "Büyük" | ✅ Sabit |
| Hikaye anlatımı | Küçük Kalpler sahneleri | ✅ Sabit (5-6 parça) |
| Kutlama/geri bildirim | "Aferin!", "Tekrar dene" | ✅ Sabit |
| Kişisel selamlama | "Merhaba Ayşe" | ❌ Dinamik (isim) |

**Önemli tespit:** İçeriğin ~%95'i **sabit metin**. Yani çalışma anında canlı TTS'e
gerek yok — bir kez üretip **hazır MP3** olarak saklamak yeterli.

---

## Seçenekler

### A) Hazır MP3 üretimi (ÖNERİLEN — ücretsiz, çevrimdışı, tutarlı)
Sabit metinleri **bir kez** iyi bir TTS ile seslendir, `assets/sounds/` altına koy,
`expo-av` ile oynat. Çalışma anında API anahtarı gerekmez.
- **Artı:** Ücretsiz (runtime), çevrimdışı çalışır, her seferinde aynı kalite, anahtar sızma riski yok.
- **Eksi:** Yeni metin ekleyince yeniden üretim gerekir (script'le kolay).
- **Nasıl:** Bir Node script'i tüm sabit metinleri tarar → TTS API'siyle .mp3 üretir →
  `assets/sounds/tts/<slug>.mp3` olarak kaydeder → `lib/assetMap.ts`'e ekler.
  `speak()` önce eşleşen MP3 var mı bakar, varsa onu çalar; yoksa canlı proxy'yi dener.

### B) Geçerli OpenAI anahtarı (canlı TTS)
Faturalı bir OpenAI hesabından `OPENAI_API_KEY`'i Vercel env'e ekle.
- **Artı:** Dinamik metin de seslenir (isim, uyarlanan geri bildirim), sıcak "coral" ses.
- **Eksi:** Aylık (küçük) maliyet, anahtar yönetimi. gpt-4o-mini-tts ~ çok düşük hacimde birkaç $/ay.
- **Not:** Proxy zaten hazır (`api/tts.ts`), sadece geçerli anahtar yeterli.

### C) Alternatif sağlayıcı ücretsiz katman
Google Cloud TTS (Türkçe WaveNet, aylık ücretsiz kota), Azure (aylık 500K karakter ücretsiz).
- **Artı:** Ücretsiz katman, iyi Türkçe sesler.
- **Eksi:** Yeni hesap/anahtar + proxy'de küçük uyarlama.

### D) Tarayıcı Web Speech API (son çare)
Cihazdaki ücretsiz ses. **Robotik** — kullanıcı bunu istemedi. Yalnızca acil yedek.

---

## Önerilen plan (ilerleyen zamanda)

1. **Faz 1 — Hazır MP3 (A):** Tüm sabit oyun/hikaye metinleri için tek seferlik MP3 üret
   (üretim anında herhangi bir kaliteli TTS: OpenAI deneme kredisi, Google veya Azure kotası).
   `speak()`'i "önce MP3, yoksa proxy" olacak şekilde güncelle. → Ses %95 çözülür, ücretsiz.
2. **Faz 2 — (İsteğe bağlı) Canlı anahtar (B):** Dinamik kısımlar (çocuğun adı) da seslensin
   istenirse Vercel'e geçerli `OPENAI_API_KEY` ekle.

**İlk adım hazır olduğunda yapılacak:** `scripts/generate-tts.mjs` (metin listesi → MP3),
`assets/sounds/tts/` klasörü, `assetMap` kayıtları, `speechService.speak()` MP3-öncelikli mantık.

## İlgili dosyalar
- `services/speechService.ts` — `speak()` girişi (MP3-öncelik buraya eklenecek)
- `api/tts.ts` — canlı proxy (coral → tts-1/nova yedeği)
- `lib/assetMap.ts` — statik `require()` haritası (MP3'ler buraya)
