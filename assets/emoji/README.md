# Yedek emoji resimleri (eski Android için)

Android 14 ve altında (API < 35), cihazın emoji yazı tipi **Emoji 12 ve sonrası** emojileri bilmeyebilir; bilmeyen emoji kutu (□) ya da
yarım kesik çıkar (Android 9 BlueStacks taramasında 48 farklı emoji, ~40 dosya). Bu klasördeki WebP'ler o emojilerin Noto Emoji
resimleridir; `lib/emojiFallback.ts` + `lib/emojiFallbackInstall.native.ts` Android'de `Text` içindeki bu emojileri satır içi resimle değiştirir.

- Dosya adı: emojinin kod noktaları (FE0F hariç) onaltılık, ZWJ dizilerinde `_` ile (örn. `1f43b_200d_2744.webp`).
- Kaynak: Google Noto Emoji (https://github.com/googlefonts/noto-emoji) — resimler Apache License 2.0, yazı tipi SIL OFL 1.1.
  128×128 WebP'e küçültülmüştür; değiştirilmiş kopyalardır.
- **Yeni bir Emoji 12+ kullanırsanız** `lib/emojiFallback.test.ts` testi düşer: `python scripts/gen_emoji_fallback.py` çalıştırın
  (resmi indirir, `lib/emojiFallbackAssets.ts` ve `lib/emojiNewCodepoints.ts` dosyalarını yeniler). Ya da daha eski, her cihazda çizilen bir emoji seçin.
