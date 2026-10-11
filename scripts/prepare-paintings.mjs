/**
 * prepare-paintings.mjs — Minik Müze tablo görsellerini Wikimedia Commons'tan (kamu malı) hazırlar.
 *
 * Her tablo için Commons'un KÜÇÜLTÜLMÜŞ sürümünü (Special:FilePath?width=N) indirir (orijinaller yüzlerce MB'dır,
 * İNDİRİLMEZ), sharp ile WebP'ye çevirip assets/images/muze/<id>.webp olarak yazar. Kaynak ve lisans bilgisi
 * constants/minikMuze.ts içindeki `credit` alanındadır; dosya adı oradan okunur (tek kaynak).
 *
 * Kullanım:
 *   node scripts/prepare-paintings.mjs --dry     # yalnız hangi adresten ne indirileceğini yazar
 *   node scripts/prepare-paintings.mjs           # indirir + dönüştürür (var olanı atlar; --force ile yeniler)
 *
 * NOT: Yeni tablo eklerken önce constants/minikMuze.ts'e `credit.commonsFile` + lisansı (Public domain) girin,
 * lisansı Commons API ile doğrulayın (extmetadata.LicenseShortName) ve aşağıdaki WIDTHS'e genişliği ekleyin.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'images', 'muze');
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

// İstenen genişlik (px). Dikey tablolarda (Mona Lisa) tam ekran yüksekliği karşılasın diye daha dar tutulur.
const WIDTHS = { 'mona-lisa': 1200, 'yildizli-gece': 1600, 'buyuk-dalga': 1600 };

// constants/minikMuze.ts TypeScript olduğundan dosyayı metin olarak okuyup id + commonsFile çiftlerini çıkarırız.
const src = await fs.readFile(path.join(ROOT, 'constants', 'minikMuze.ts'), 'utf8');
const items = [...src.matchAll(/id: '([a-z-]+)',[\s\S]*?commonsFile: '([^']+)',[\s\S]*?license: 'Public domain'/g)]
    .map((m) => ({ id: m[1], file: m[2] }));

if (!items.length) throw new Error('constants/minikMuze.ts içinde tablo bulunamadı');
await fs.mkdir(OUT_DIR, { recursive: true });

for (const { id, file } of items) {
    const width = WIDTHS[id];
    if (!width) { console.log(`- ${id}: WIDTHS'te genişlik yok, atlandı`); continue; }
    const out = path.join(OUT_DIR, `${id}.webp`);
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=${width}`;
    if (!FORCE) {
        try { await fs.access(out); console.log(`= ${id}: var, atlandı`); continue; } catch { /* yok: devam */ }
    }
    console.log(`${DRY ? '[dry] ' : ''}${id}: ${url}`);
    if (DRY) continue;

    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'MinikMuze/1.0 (educational app; asset preparation script)' } });
    if (!res.ok) throw new Error(`${id}: indirme hatası ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const img = sharp(buf);
    const meta = await img.metadata();
    await img.webp({ quality: 84 }).toFile(out);
    const stat = await fs.stat(out);
    console.log(`  ✓ ${id}: ${meta.width}x${meta.height} → ${(stat.size / 1024).toFixed(0)} KB (WebP), kaynak ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log('Bitti. Sonraki: node scripts/gen-voices.mjs (anlatım metinleri) → gen-tts-assets.mjs');
