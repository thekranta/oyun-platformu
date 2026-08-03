# 🔊 Hazır Seslendirme (TTS) klipleri

Bu klasör, oyun **sabit metinlerinin** önceden üretilmiş seslendirmelerini tutar (`.wav`).
`speak(text)` çağrıldığında uygulama önce `ttsSlug(text)` ile `lib/ttsAssets.ts`'e bakar;
eşleşen klip varsa **çevrimdışı** çalar (canlı API/anahtar gerekmez), yoksa sessiz geçer.

Klipler **VoiceBox** yerel API'siyle, klonlanmış **"Hikaye Sesi"** profilinden otomatik üretilir.

## Yeni/güncel ses üretme akışı

VoiceBox uygulaması **açık** olmalı (yerel sunucu `127.0.0.1:17493`) ve "Hikaye Sesi" profili var olmalı.

```bash
# 1) Kaynaktaki sabit speak('...') metinlerini tara → scripts/tts-phrases.json
node scripts/extract-tts-phrases.mjs

# 2) Eksik olan her metni klon sesle üret → assets/sounds/tts/<slug>.wav
#    (var olanları atlar; --force ile hepsini yeniden üretir; ~30 sn/klip, CPU)
node scripts/gen-voices.mjs

# 3) slug→dosya haritasını yeniden yaz → lib/ttsAssets.ts
node scripts/gen-tts-assets.mjs
```

Yeni bir oyun eklediğinde bu üç adımı tekrar çalıştırman yeni yönerge/geri bildirim
metinlerini otomatik seslendirir.

Profili sıfırdan kurmak için: `node scripts/make-profile.mjs` (coral hikaye örneklerinden klonlar).

## Dosya adlandırma (slug kuralı)

Dosya adı = metnin slug'ı + `.wav`. Slug = `services/speechService.ts` `ttsSlug()`:

- Türkçe harfler sadeleşir: `ç→c, ş→s, ğ→g, ü→u, ö→o, ı/İ/I→i`
- tümü küçük harf; harf/rakam dışındaki her şey tek `-`; baş/son `-` atılır

| Metin | Dosya |
|---|---|
| `Doğru! Aferin.` | `dogru-aferin.wav` |
| `Sırada hangi renk var?` | `sirada-hangi-renk-var.wav` |

## Notlar

- Format **.wav** (24kHz mono). `metro.config.js` `assetExts`'te `wav` var; her klip yalnız
  çalınınca yüklenir (bundle şişmez). `.mp3` de desteklenir (aynı slug'ta `.mp3` tercih edilir).
- Dosya adları **küçük harf** (Vercel/Linux büyük-küçük harfe duyarlı).
- Dinamik metinler (çocuğun adı, "3 tane!" gibi sayı içerenler) henüz seslenmez — sonra ele alınacak.
- Elle ekleme (yedek yol): doğru adlı `<slug>.wav` dosyasını klasöre koy → `node scripts/gen-tts-assets.mjs`.
