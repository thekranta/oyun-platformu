/**
 * gen-voices.mjs — VoiceBox yerel API'siyle (klon ses) sabit metinlerin seslendirmesini
 * üretir ve assets/sounds/tts/<slug>.wav olarak kaydeder. Kaldığı yerden devam eder
 * (var olan dosyayı atlar). Bittikten sonra `node scripts/gen-tts-assets.mjs` çalıştır.
 *
 * VoiceBox uygulaması AÇIK olmalı (yerel sunucu 127.0.0.1:17493).
 *
 * Kullanım:
 *   node scripts/gen-voices.mjs                  # tüm metinler (tts-phrases.json)
 *   node scripts/gen-voices.mjs slug1 slug2      # yalnız bu slug'lar
 *   node scripts/gen-voices.mjs --limit 5        # ilk 5
 *   node scripts/gen-voices.mjs --force          # var olanları da yeniden üret
 *   node scripts/gen-voices.mjs --profile <id>   # profil id override
 */
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TTS_DIR = join(ROOT, 'assets', 'sounds', 'tts');
const PHRASES = join(__dirname, 'tts-phrases.json');
const BASE = process.env.VOICEBOX_URL || 'http://127.0.0.1:17493';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// argv
const argv = process.argv.slice(2);
let profileOverride = null, limit = null, force = false, outDirArg = null;
const onlySlugs = [];
const adhocTexts = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--force') force = true;
  else if (a === '--limit') limit = parseInt(argv[++i], 10);
  else if (a === '--profile') profileOverride = argv[++i];
  else if (a === '--outdir') outDirArg = argv[++i];
  else if (a === '--text') adhocTexts.push(argv[++i]);
  else onlySlugs.push(a);
}
const OUT_DIR = outDirArg || TTS_DIR;

function ttsSlug(text) {
  return (text || '')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function pickProfile() {
  const j = await (await fetch(BASE + '/profiles')).json();
  const list = Array.isArray(j) ? j : (j.value || j.profiles || j.items || j.data || []);
  if (!list.length) throw new Error('VoiceBox: hiç profil yok. Önce uygulamada ses klonla.');
  let p;
  if (profileOverride) p = list.find((x) => x.id === profileOverride);
  else p = list.find((x) => x.name === 'Hikaye Sesi') || list.find((x) => x.voice_type === 'cloned') || list[0];
  if (!p) throw new Error('Profil bulunamadı: ' + profileOverride);
  return p;
}

async function generateOne(profile, text) {
  const body = {
    profile_id: profile.id,
    text,
    language: profile.language || 'tr',
    engine: profile.default_engine || 'chatterbox',
  };
  const gen = await fetch(BASE + '/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!gen.ok) throw new Error('generate HTTP ' + gen.status + ' ' + (await gen.text()).slice(0, 200));
  const id = (await gen.json()).id;

  // /history/{id} bitene kadar izle (max ~4 dk)
  for (let i = 0; i < 160; i++) {
    await sleep(1500);
    const r = await fetch(`${BASE}/history/${id}`);
    if (!r.ok) continue;
    const rec = await r.json();
    if (rec.status === 'completed') break;
    if (['failed', 'error', 'cancelled'].includes(rec.status)) {
      throw new Error('üretim ' + rec.status + ': ' + (rec.error || ''));
    }
    if (i === 159) throw new Error('zaman aşımı (4 dk)');
  }

  const a = await fetch(BASE + '/audio/' + id);
  if (!a.ok) throw new Error('audio HTTP ' + a.status);
  const buf = Buffer.from(await a.arrayBuffer());
  if (buf.length < 1024 || buf.subarray(0, 4).toString('latin1') !== 'RIFF') {
    throw new Error('geçersiz ses (bytes=' + buf.length + ')');
  }
  return buf;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  let phrases;
  if (adhocTexts.length) {
    phrases = adhocTexts.map((t) => ({ text: t }));
  } else {
    phrases = JSON.parse(readFileSync(PHRASES, 'utf8'));
    // Dinamik (çözülmüş şablon) cümleler varsa onları da kat
    const DYN = join(__dirname, 'tts-phrases-dynamic.json');
    if (existsSync(DYN)) phrases = phrases.concat(JSON.parse(readFileSync(DYN, 'utf8')));
    // Sayı klipleri: ses kelime-formu (text), dosya adı rakamlı (slug override)
    const NUM = join(__dirname, 'tts-phrases-numbers.json');
    if (existsSync(NUM)) phrases = phrases.concat(JSON.parse(readFileSync(NUM, 'utf8')));
    // Giriş yönergeleri (CountdownOverlay message'ları)
    const CD = join(__dirname, 'tts-phrases-countdown.json');
    if (existsSync(CD)) phrases = phrases.concat(JSON.parse(readFileSync(CD, 'utf8')));
    // Yeni oyunların metinleri
    const NG = join(__dirname, 'tts-phrases-newgames.json');
    if (existsSync(NG)) phrases = phrases.concat(JSON.parse(readFileSync(NG, 'utf8')));
    const NG2 = join(__dirname, 'tts-phrases-newgames2.json');
    if (existsSync(NG2)) phrases = phrases.concat(JSON.parse(readFileSync(NG2, 'utf8')));
    const NG3 = join(__dirname, 'tts-phrases-newgames3.json');
    if (existsSync(NG3)) phrases = phrases.concat(JSON.parse(readFileSync(NG3, 'utf8')));
    const NG4 = join(__dirname, 'tts-phrases-newgames4.json');
    if (existsSync(NG4)) phrases = phrases.concat(JSON.parse(readFileSync(NG4, 'utf8')));
    // Serbest/cizim oyunlarina sonradan eklenen giris yonergeleri
    const INTRO2 = join(__dirname, 'tts-phrases-intro2.json');
    if (existsSync(INTRO2)) phrases = phrases.concat(JSON.parse(readFileSync(INTRO2, 'utf8')));
    // Maarif bosluk oyunlari (Sanat / Muzik / kroki / jimnastik)
    const NG5 = join(__dirname, 'tts-phrases-newgames5.json');
    if (existsSync(NG5)) phrases = phrases.concat(JSON.parse(readFileSync(NG5, 'utf8')));
    if (onlySlugs.length) phrases = phrases.filter((p) => onlySlugs.includes(p.slug));
    if (limit != null) phrases = phrases.slice(0, limit);
  }

  const profile = await pickProfile();
  console.log(`Profil: "${profile.name}" (${profile.id})  dil=${profile.language}  motor=${profile.default_engine || 'chatterbox'}`);
  console.log(`İşlenecek metin: ${phrases.length}\n`);

  let done = 0, skip = 0, fail = 0;
  const t0 = Date.now();
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const slug = p.slug || ttsSlug(p.text);
    const out = join(OUT_DIR, slug + '.wav');
    const tag = `[${i + 1}/${phrases.length}] ${slug}`;
    if (!force && existsSync(out) && statSync(out).size > 1024) {
      console.log(`${tag} — atlandı (var)`);
      skip++; continue;
    }
    const ct = Date.now();
    // VoiceBox geçici olarak yanıt vermeyi kesebiliyor ("fetch failed"); tek bir
    // hıçkırık kalan yüzlerce klibi düşürmesin diye artan beklemeyle 3 deneme.
    let saved = false;
    for (let attempt = 1; attempt <= 3 && !saved; attempt++) {
      try {
        const buf = await generateOne(profile, p.text);
        writeFileSync(out, buf);
        console.log(`${tag} — ✅ ${(buf.length / 1024).toFixed(0)}KB (${((Date.now() - ct) / 1000).toFixed(0)}s)  "${p.text}"`);
        done++; saved = true;
      } catch (e) {
        if (attempt === 3) {
          console.log(`${tag} — ❌ ${e.message} (3 denemede olmadı)`);
          fail++;
        } else {
          console.log(`${tag} — ⚠️ ${e.message} — ${attempt * 15}s sonra tekrar denenecek`);
          await sleep(attempt * 15000);
        }
      }
    }
    await sleep(400);
  }
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\nBitti: ${done} üretildi, ${skip} atlandı, ${fail} hata  (${mins} dk)`);
  console.log('Şimdi: node scripts/gen-tts-assets.mjs');
}
main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
