# 🔊 Hazır Seslendirme (TTS) MP3'leri

Bu klasör, oyun/hikaye **sabit metinlerinin** önceden üretilmiş seslendirmelerini tutar.
`speak(text)` çağrıldığında uygulama önce buraya bakar; eşleşen MP3 varsa **çevrimdışı** çalar
(canlı API/anahtar gerekmez), yoksa sessiz geçer.

## Dosya adlandırma (ÇOK ÖNEMLİ)

Dosya adı = metnin **slug**'ı + `.mp3`. Slug kuralı:

- Türkçe harfler sadeleşir: `ç→c, ş→s, ğ→g, ü→u, ö→o, ı/İ/I→i`
- Tümü **küçük harf**
- Harf/rakam dışındaki her şey (boşluk, `!`, `?`, `.`, `,`) tek bir `-` olur
- Baştaki/sondaki `-` atılır

| Söylenecek metin | Dosya adı |
|---|---|
| `Aferin!` | `aferin.mp3` |
| `Doğru! Aferin.` | `dogru-aferin.mp3` |
| `Tekrar dene!` | `tekrar-dene.mp3` |
| `Sırada hangi renk var?` | `sirada-hangi-renk-var.mp3` |
| `Aferin! Örüntüyü buldun.` | `aferin-oruntuyu-buldun.mp3` |

> Emin değilsen dosya adını sen uydurmana gerek yok — Claude her metin için tam dosya adını verir.

## İş akışı

1. Metni PC programına ver → MP3 al.
2. MP3'ü **tam olarak yukarıdaki dosya adıyla** bu klasöre (`assets/sounds/tts/`) koy.
3. Şu komutu çalıştır (Claude da çalıştırabilir):
   ```bash
   node scripts/gen-tts-assets.mjs
   ```
   Bu, `lib/ttsAssets.ts` haritasını otomatik günceller.
4. Uygulamayı aç → ses kendiliğinden gelir.

## Notlar

- **Tek ses/ton kullan:** Tüm dosyaları aynı ses ve aynı hızla üret (tutarlılık için).
  Okul öncesi için sıcak, sakin, biraz yavaş bir kadın sesi idealdir.
- Format **MP3** (hem web hem tablet oynatır). Dosya adları **küçük harf** olmalı
  (Vercel/Linux büyük-küçük harfe duyarlıdır).
- Dinamik metinler (çocuğun adı, sayı içeren "3 tane!" gibi) şimdilik seslenmez; bunları
  ileride ayrıca ele alacağız. Önce sabit metinler.
