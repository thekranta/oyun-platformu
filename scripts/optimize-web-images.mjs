/**
 * optimize-web-images.mjs — web'de ilk yükleme için görsel boyutlarını küçültür (sharp). İdempotent: tekrar çalıştırmak
 * zararsızdır (güncel dosyalar atlanır; --force ile yenilenir).
 *
 *  1) Minik Müze (assets/images/muze/<id>.webp, tam boy DOKUNULMAZ): türev dosyalar üretilir
 *       thumbs/<id>.webp  (uzun kenar 480 px)  — galeri kartları; eskiden 16 tablonun TAMAMI (13,9 MB) küçük kart için iniyordu
 *       small/<id>.webp   (uzun kenar 1280 px) — küçük ekran / yavaş bağlantıda web'de sahne görseli (yalnız web paketine girer,
 *                                                components/minikMuze/paintingSmall.web.ts)
 *  2) Hikâye seçenek görselleri / düğmeler / rozetler (assets/images/stories/**): ekranda en çok 350 px gösterildiğinden
 *     uzun kenarı 960 px'e yerinde düşürülür (zaten küçükse atlanır; asıl dosyalar git geçmişinde). Arka plan/sahne görsellerine dokunulmaz.
 *
 * Kullanım: node scripts/optimize-web-images.mjs [--dry] [--force]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

sharp.cache(false);   // Windows: libvips dosyayı açık tutup yerinde yazmayı engelliyordu

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MUZE = path.join(ROOT, 'assets', 'images', 'muze');
const STORIES = path.join(ROOT, 'assets', 'images', 'stories');
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

const THUMB = { side: 480, quality: 72 };
const SMALL = { side: 1280, quality: 78 };
const STORY_ICON = { side: 960, quality: 80 };
const STORY_ICON_NAME = /(_icon_|^btn_|_badge)/;

const kb = (n) => (n / 1024).toFixed(0).padStart(5) + ' KB';
let before = 0;
let after = 0;

async function mtime(p) {
    try { return (await fs.stat(p)).mtimeMs; } catch { return 0; }
}

async function derive(src, dest, { side, quality }) {
    if (!FORCE && (await mtime(dest)) >= (await mtime(src))) return null;
    if (DRY) return { skipped: 'dry' };
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const info = await sharp(src).resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true }).webp({ quality, effort: 6 }).toFile(dest);
    return info;
}

// ---------------------------------------------------------------- Müze
const muzeFiles = (await fs.readdir(MUZE)).filter((f) => f.endsWith('.webp'));
console.log(`Minik Müze: ${muzeFiles.length} tablo`);
for (const f of muzeFiles.sort()) {
    const src = path.join(MUZE, f);
    const full = (await fs.stat(src)).size;
    const t = await derive(src, path.join(MUZE, 'thumbs', f), THUMB);
    const s = await derive(src, path.join(MUZE, 'small', f), SMALL);
    const tSize = (await mtime(path.join(MUZE, 'thumbs', f))) ? (await fs.stat(path.join(MUZE, 'thumbs', f))).size : 0;
    const sSize = (await mtime(path.join(MUZE, 'small', f))) ? (await fs.stat(path.join(MUZE, 'small', f))).size : 0;
    console.log(`  ${f.padEnd(36)} tam ${kb(full)}  küçük ${kb(sSize)}  önizleme ${kb(tSize)}${t || s ? '  (üretildi)' : ''}`);
    before += full;
    after += tSize;
}
console.log(`  galeri: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(2)} MB (önizlemeler)\n`);

// ---------------------------------------------------------------- Hikâyeler
let storyBefore = 0;
let storyAfter = 0;
for (const story of await fs.readdir(STORIES)) {
    const dir = path.join(STORIES, story);
    if (!(await fs.stat(dir)).isDirectory()) continue;
    for (const f of (await fs.readdir(dir)).sort()) {
        if (!f.endsWith('.webp') || !STORY_ICON_NAME.test(f)) continue;
        const p = path.join(dir, f);
        const input = await fs.readFile(p);   // tampondan işle: dosya tutacağı açık kalmasın (Windows'ta yerinde yazma için şart)
        const meta = await sharp(input).metadata();
        const size = input.length;
        storyBefore += size;
        if (Math.max(meta.width, meta.height) <= STORY_ICON.side) { storyAfter += size; continue; }
        if (DRY) { storyAfter += size; console.log(`  [dry] ${story}/${f} ${meta.width}x${meta.height} ${kb(size)}`); continue; }
        const buf = await sharp(input).resize({ width: STORY_ICON.side, height: STORY_ICON.side, fit: 'inside', withoutEnlargement: true }).webp({ quality: STORY_ICON.quality, effort: 6 }).toBuffer();
        if (buf.length >= size) { storyAfter += size; console.log(`  = ${story}/${f}: kazanç yok, atlandı`); continue; }
        await fs.writeFile(p, buf);
        storyAfter += buf.length;
        console.log(`  ${story}/${f.padEnd(40)} ${meta.width}x${meta.height} ${kb(size)} -> ${kb(buf.length)}`);
    }
}
console.log(`Hikâye seçenek/düğme/rozet görselleri: ${(storyBefore / 1048576).toFixed(2)} MB -> ${(storyAfter / 1048576).toFixed(2)} MB${DRY ? ' (DRY)' : ''}`);
