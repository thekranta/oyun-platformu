/**
 * gen-tts-manifest.mjs — web'de klipleri ÖNCEDEN indirmek için "hangi oyun hangi klipleri çalar" tablosunu üretir
 * ve lib/ttsPreloadData.ts'e yazar.
 *
 * Kullanım:  node scripts/gen-tts-manifest.mjs      (yeni klip/oyun eklendikten sonra, gen-tts-assets.mjs'ten sonra)
 *
 * Nasıl: components/gameRegistry.tsx'teki her routeKey için, o oyunun bileşen dosyasındaki (ve yalnız
 * constants/ lib/ components/ altındaki yardımcı dosyalardan içe aldıklarındaki) TÜM sabit metinlerin slug'ı
 * lib/ttsAssets.ts'te varsa o klip oyunun listesine girer. Şablon metinler (${...}) eşleşmez; onlar ilk
 * ÖNEMLİ: şablon metinler (`${n} tane! Aferin.`) doğrudan eşleşmez; boşluklar sayılarla (0-30) ve OYUNUN KENDİ sabit metinleriyle
 * (veri tablolarındaki ad/sözcükler) doldurulup var olan klip slug'larıyla eşleşenler eklenir (başka oyunların klipleri sızmaz).
 * scripts/tts-phrases-*.json'daki "game" etiketli dinamik metinler de eklenir.
 * Sıralama: önce giriş yönergesi (CountdownOverlay mesajı), sonra dosyadaki görünme sırası.
 * COMMON_CLIPS: çok sayıda oyunda geçen klipler (Aferin, sayılar...) — menüde/girişte ısıtılır, oyun listelerinden çıkarılır.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'lib', 'ttsPreloadData.ts');

/** Bir oyunun listesinde en çok bu kadar klip (≈25 KB/klip); aşan oyunlar OVERSIZED_KEEP'e kısaltılır. */
const MAX_PER_GAME = 60;
/** MAX_PER_GAME'i aşan oyunlarda (yüzlerce klipli havuzlar) yalnız ilk bu kadarı önceden iner. */
const OVERSIZED_KEEP = 12;
/** COMMON_CLIPS'e girmek için en az bu kadar oyunda geçmeli ve toplam en çok bu kadar klip olmalı. */
const COMMON_MIN_GAMES = 8;
const COMMON_MAX = 20;
/** Her çocuğun erken duyacağı geri bildirim klipleri: oyun sayısına bakılmadan ortak sayılır. */
const ALWAYS_COMMON = ['aferin', 'harika', 'tebrikler', 'tekrar-dene', 'dogru-aferin'];

// services/speechService.ts ttsSlug ile AYNI kural.
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

const read = (p) => readFileSync(p, 'utf8');

// 1) Var olan klipler
const CLIPS = new Set([...read(join(ROOT, 'lib', 'ttsAssets.ts')).matchAll(/^\s*'([^']+)':\s*require\(/gm)].map((m) => m[1]));
if (CLIPS.size < 100) throw new Error('lib/ttsAssets.ts okunamadı (klip sayısı ' + CLIPS.size + ')');

// 2) Kayıt defteri: tembel bileşen adı -> dosya; routeKey -> { bileşenler, kayıt satırındaki metinler }
const registry = read(join(ROOT, 'components', 'gameRegistry.tsx'));
const lazy = new Map();
for (const m of registry.matchAll(/const (\w+) = lazyWithReload\(\(\) => import\('\.\/(\w+)'\)\)/g)) lazy.set(m[1], m[2]);

const rendStart = registry.indexOf('export const GAME_RENDERERS');
if (rendStart < 0) throw new Error('GAME_RENDERERS bulunamadı');
const rendBody = registry.slice(rendStart);
const entryRe = /^ {2}(?:'([^']+)'|([A-Za-z0-9_]+)): \(/gm;
const entries = [];
for (let m; (m = entryRe.exec(rendBody));) entries.push({ key: m[1] ?? m[2], at: m.index });
entries.forEach((e, i) => { e.text = rendBody.slice(e.at, i + 1 < entries.length ? entries[i + 1].at : rendBody.length); });

// 3) Kaynak tarama yardımcıları
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
}
function unescape(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(['"`\\])/g, '$1');
}
function literals(src) {
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`([^`$\\]*)`/g;
  for (let m; (m = re.exec(src));) {
    const s = unescape(m[1] ?? m[2] ?? m[3] ?? '');
    if (s.length >= 2) out.push(s);
  }
  return out;
}
/** ${...} içeren şablon metinleri: { parts: [sabit parçalar], exprs: [ifade metinleri] } */
function templates(src) {
  const out = [];
  const re = /`((?:[^`\\$]|\\.|\$(?!\{)|\$\{[^{}`]*\})*)`/g;
  for (let m; (m = re.exec(src));) {
    if (!m[1].includes('${')) continue;
    const parts = [];
    const exprs = [];
    let last = 0;
    for (const x of m[1].matchAll(/\$\{([^{}`]*)\}/g)) {
      parts.push(unescape(m[1].slice(last, x.index)));
      exprs.push(x[1].trim());
      last = x.index + x[0].length;
    }
    parts.push(unescape(m[1].slice(last)));
    if (exprs.length >= 1 && exprs.length <= 2) out.push({ parts, exprs });
  }
  return out;
}
const NUMBERS = Array.from({ length: 31 }, (_, i) => String(i));
/** Bir şablonun olası doldurmalarının slug'ları (yalnız var olan klipler döner). */
function expandTemplate(t, fills, hit) {
  const build = (vals) => ttsSlug(t.parts.map((p, i) => p + (vals[i] ?? '')).join(''));
  if (t.exprs.length === 1) {
    for (const f of fills) hit(build([f]));
    return;
  }
  const same = t.exprs[0] === t.exprs[1];
  for (const a of NUMBERS) {
    if (same) { hit(build([a, a])); continue; }
    for (const b of NUMBERS) hit(build([a, b]));
  }
}

function resolveImport(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const c of [base + '.ts', base + '.tsx', join(base, 'index.ts'), join(base, 'index.tsx')]) if (existsSync(c)) return c;
  return null;
}

const GAME_FILES = new Set([...lazy.values()].map((n) => join(ROOT, 'components', n + '.tsx')));
const DENY = /(?:^|[\\/])(gameCatalog|maarifMap|maarifCurriculum|assetMap|ttsAssets|ttsPreloadData|supabase|apiBase|subscriptionTiers|gameAccess|classAccess|gameResults|i18n[^\\/]*|gameRegistry|musicPolicy)\.tsx?$/i;
const FOLLOW_DIRS = ['constants', 'lib', 'components'].map((d) => join(ROOT, d) + '\\').concat(['constants', 'lib', 'components'].map((d) => join(ROOT, d) + '/'));
const followable = (f) => FOLLOW_DIRS.some((d) => f.startsWith(d)) && !DENY.test(f) && !GAME_FILES.has(f) && !/\.test\.tsx?$/.test(f);

/** Dosya + içe aldığı (en çok 2 düzey) yardımcı dosyalar; görünme sırası korunur. */
function collectFiles(entryFile) {
  const seen = new Set();
  const order = [];
  const visit = (f, depth) => {
    if (seen.has(f) || !existsSync(f)) return;
    seen.add(f);
    order.push(f);
    if (depth >= 2) return;
    const src = stripComments(read(f));
    for (const m of src.matchAll(/(?:from\s+|import\(\s*|require\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const t = resolveImport(f, m[1]);
      if (t && followable(t)) visit(t, depth + 1);
    }
  };
  visit(entryFile, 0);
  return order;
}

// 4) scripts/tts-phrases-*.json içindeki game etiketli metinler + giriş yönergeleri kümesi
const dynamicByGame = new Map(); // bileşen adı -> [metin]
const introSlugs = new Set();
for (const f of readdirSync(__dirname).filter((n) => /^tts-phrases.*\.json$/.test(n))) {
  let rows;
  try { rows = JSON.parse(read(join(__dirname, f))); } catch { continue; }
  if (!Array.isArray(rows)) continue;
  for (const r of rows) {
    const text = r.text ?? r.slug;
    if (!text) continue;
    const slug = r.slug && CLIPS.has(r.slug) ? r.slug : ttsSlug(text);
    if (f === 'tts-phrases-countdown.json' || f.startsWith('tts-phrases-intro')) introSlugs.add(slug);
    if (r.game) {
      if (!dynamicByGame.has(r.game)) dynamicByGame.set(r.game, []);
      dynamicByGame.get(r.game).push(slug);
    }
    if (Array.isArray(r.games)) for (const g of r.games) { if (!dynamicByGame.has(g)) dynamicByGame.set(g, []); dynamicByGame.get(g).push(slug); }
  }
}

// 5) Her routeKey için sıralı klip listesi
const perGame = new Map(); // routeKey -> slug[]
for (const e of entries) {
  const comps = [...new Set([...e.text.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1]).filter((n) => lazy.has(n)))].map((n) => lazy.get(n));
  if (comps.length === 0) continue;
  const intro = [];
  const rest = [];
  const add = (slug) => {
    if (!CLIPS.has(slug) || intro.includes(slug) || rest.includes(slug)) return;
    (introSlugs.has(slug) ? intro : rest).push(slug);
  };
  for (const s of literals(stripComments(e.text))) add(ttsSlug(s));
  const fills = new Set(NUMBERS);
  const tpls = [];
  for (const comp of comps) {
    const file = join(ROOT, 'components', comp + '.tsx');
    for (const f of collectFiles(file)) {
      const src = stripComments(read(f));
      for (const s of literals(src)) { add(ttsSlug(s)); if (s.length <= 40) fills.add(s); }
      tpls.push(...templates(src));
    }
    for (const slug of dynamicByGame.get(comp) ?? []) add(slug);
  }
  for (const t of tpls) expandTemplate(t, [...fills], add);
  perGame.set(e.key, [...intro, ...rest]);
}

// 6) Ortak klipler: çok oyunda geçenler
const gameCount = new Map();
for (const list of perGame.values()) for (const s of new Set(list)) gameCount.set(s, (gameCount.get(s) ?? 0) + 1);
const frequent = [...gameCount.entries()]
  .filter(([, n]) => n >= COMMON_MIN_GAMES)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([s]) => s);
const common = [...new Set([...ALWAYS_COMMON.filter((s) => CLIPS.has(s)), ...frequent])].slice(0, COMMON_MAX);
const commonSet = new Set(common);

// 7) Yaz
const keys = [...perGame.keys()].sort();
let totalRefs = 0;
const lines = [];
for (const k of keys) {
  let list = perGame.get(k).filter((s) => !commonSet.has(s));
  if (list.length > MAX_PER_GAME) list = list.slice(0, OVERSIZED_KEEP);   // çok klipli (anlatım/ipucu havuzu) oyun: yalnız ilkleri
  if (list.length === 0) continue;
  totalRefs += list.length;
  lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(list.join('|'))},`);
}
const header = `/**
 * ttsPreloadData — web'de ÖNCEDEN indirilecek klipler (slug). BU DOSYA OTOMATİK ÜRETİLİR; elle düzenleme:
 *   node scripts/gen-tts-manifest.mjs
 * COMMON_CLIPS: çok oyunda geçen klipler (menüde/girişte ısıtılır). CLIPS_BY_GAME: routeKey -> 'slug|slug|...'
 * (giriş yönergesi önce). Yalnız tembel yüklenir (services/clipPreload.ts, dinamik import): ana pakete girmez.
 */
`;
const body = `export const COMMON_CLIPS: readonly string[] = ${JSON.stringify(common, null, 2)};\n\nexport const CLIPS_BY_GAME: Readonly<Record<string, string>> = {\n${lines.join('\n')}\n};\n`;
writeFileSync(OUT, header + body, 'utf8');

console.log(`✅ ${lines.length}/${entries.length} oyun, ortak ${common.length} klip, oyun listelerinde toplam ${totalRefs} klip → ${relative(ROOT, OUT)}`);
const sizes = keys.map((k) => [k, perGame.get(k).filter((s) => !commonSet.has(s)).length]).sort((a, b) => b[1] - a[1]);
console.log('en çok klipli 5 oyun:', sizes.slice(0, 5).map(([k, n]) => `${k}=${n}`).join(', '));
console.log('klipsiz oyunlar:', entries.map((e) => e.key).filter((k) => !lines.some((l) => l.startsWith(`  ${JSON.stringify(k)}:`))).join(', ') || '(yok)');
console.log('ortak klipler:', common.join(', '));
