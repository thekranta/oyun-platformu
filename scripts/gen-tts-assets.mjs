/**
 * gen-tts-assets.mjs — assets/sounds/tts/ altındaki *.mp3 dosyalarını tarar ve
 * lib/ttsAssets.ts (slug → require) haritasını yeniden üretir.
 *
 * Kullanım:  node scripts/gen-tts-assets.mjs
 *
 * Dosya adı = slug (ör. dogru-aferin.mp3). Anahtar, speechService.ttsSlug ile AYNI
 * kuralla normalize edilir; require yolu ise diskteki gerçek dosya adını kullanır
 * (Vercel/Linux büyük-küçük harfe duyarlı olduğundan dosya adları küçük harf olmalı).
 */
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TTS_DIR = join(ROOT, 'assets', 'sounds', 'tts');
const OUT = join(ROOT, 'lib', 'ttsAssets.ts');

// services/speechService.ts ttsSlug ile birebir aynı kural
function ttsSlug(text) {
  return (text || '')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

if (!existsSync(TTS_DIR)) mkdirSync(TTS_DIR, { recursive: true });

const files = readdirSync(TTS_DIR)
  .filter((f) => f.toLowerCase().endsWith('.mp3'))
  .sort();

const seen = new Map(); // slug -> filename (ilk gelen kazanır; çakışma uyarısı)
const entries = [];
for (const file of files) {
  const base = file.replace(/\.mp3$/i, '');
  const slug = ttsSlug(base);
  if (!slug) continue;
  if (seen.has(slug)) {
    console.warn(`⚠️  Aynı slug'a düşen iki dosya: "${seen.get(slug)}" ve "${file}" (slug: ${slug}). İlki kullanıldı.`);
    continue;
  }
  seen.set(slug, file);
  entries.push(`  '${slug}': require('../assets/sounds/tts/${file}'),`);
}

const body = entries.length
  ? entries.join('\n')
  : '  // Henüz hazır MP3 yok. Dosyalar assets/sounds/tts/ altına eklenip bu script\n  // tekrar çalıştırıldığında bu harita dolar.';

const out = `/**
 * ttsAssets — Hazır (önceden üretilmiş) seslendirme MP3'lerinin slug→modül haritası.
 * ---------------------------------------------------------------------------------
 * BU DOSYA OTOMATİK ÜRETİLİR. Elle düzenleme; şunu çalıştır:
 *   node scripts/gen-tts-assets.mjs
 * (assets/sounds/tts/ altındaki *.mp3 dosyalarını tarar ve aşağıdaki haritayı yazar.)
 *
 * Anahtar (slug) kuralı = services/speechService.ts \`ttsSlug()\`.
 * speak(text) önce ttsSlug(text) ile buraya bakar; varsa MP3'ü çalar, yoksa sessiz geçer.
 */
export const TTS: Record<string, number> = {
${body}
};
`;

writeFileSync(OUT, out, 'utf8');
console.log(`✅ lib/ttsAssets.ts güncellendi — ${entries.length} hazır MP3 kaydedildi.`);
