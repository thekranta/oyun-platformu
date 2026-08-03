/**
 * extract-tts-phrases.mjs — components/ altındaki SABİT (dinamik olmayan) speak('...')
 * metinlerini çıkarır, slug'lar, tekilleştirir ve scripts/tts-phrases.json'a yazar.
 *
 * Kullanım:  node scripts/extract-tts-phrases.mjs
 *
 * Yalnız tek tırnaklı, ${...} içermeyen sabit metinler alınır (şablon/dinamik hariç).
 * Çıktı: [{ slug, text, count, games:[...] }, ...]  (sıklığa göre azalan)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COMP = join(ROOT, 'components');
const OUT = join(__dirname, 'tts-phrases.json');

function ttsSlug(text) {
  return (text || '')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const map = new Map(); // slug -> { text, count, games:Set }
function add(text, game) {
  if (!text || text.includes('${') || text.includes('`')) return;
  const slug = ttsSlug(text);
  if (!slug) return;
  if (!map.has(slug)) map.set(slug, { text, count: 0, games: new Set() });
  const e = map.get(slug);
  e.count++;
  e.games.add(game);
}

for (const f of readdirSync(COMP).filter((f) => f.endsWith('.tsx'))) {
  const src = readFileSync(join(COMP, f), 'utf8');
  const game = f.replace(/\.tsx$/, '');
  const re1 = /\bspeak\(\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re1.exec(src))) add(m[1].replace(/\\'/g, "'"), game);
  const re2 = /\?\s*'((?:[^'\\]|\\.)*)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;
  while ((m = re2.exec(src))) {
    const ls = src.lastIndexOf('\n', m.index), le = src.indexOf('\n', m.index);
    if (src.slice(ls, le).includes('speak(')) { add(m[1], game); add(m[2], game); }
  }
}

const rows = [...map.values()]
  .map((e) => ({ slug: ttsSlug(e.text), text: e.text, count: e.count, games: [...e.games].sort() }))
  .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'tr'));

writeFileSync(OUT, JSON.stringify(rows, null, 2), 'utf8');
console.log(`✅ ${rows.length} sabit metin → scripts/tts-phrases.json`);
