/**
 * gen-en-clips.mjs — İngilizce ek etkinlik kliplerini VoiceBox'ın Kokoro motoruyla (af_heart, Amerikan kadın) üretir.
 * Metin listesi constants/ingilizceKelimeler.ts (enKlipMetinleri) — oyunlarla AYNI kaynak.
 * Çıktı: assets/sounds/tts/eng-<slug>.wav (var olan atlanır; --force ile yeniden üretilir).
 *
 * Kullanım:
 *   node scripts/gen-en-clips.mjs            # eksik klipleri üret
 *   node scripts/gen-en-clips.mjs --force    # hepsini yeniden üret
 *   node scripts/gen-en-clips.mjs --list     # yalnız metin/slug listesini göster
 * Sonra: node scripts/compress-voices.mjs && node scripts/gen-tts-assets.mjs
 *
 * VoiceBox AÇIK olmalı (127.0.0.1:17493). Kokoro Türkçe konuşmaz: Türkçe yönergeler mevcut klon sesle (gen-voices.mjs) üretilir.
 * Node, .ts dosyasını doğrudan içe aktarır (type stripping): constants/ingilizceKelimeler.ts bağımlılıksız tutulmalıdır.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enKlipMetinleri, enSlug } from '../constants/ingilizceKelimeler.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'assets', 'sounds', 'tts');
const BASE = process.env.VOICEBOX_URL || 'http://127.0.0.1:17493';
const PROFILE_NAME = 'İngilizce Heart (Kokoro)';
const VOICE_ID = 'af_heart';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const force = process.argv.includes('--force');
const listOnly = process.argv.includes('--list');

const texts = enKlipMetinleri();
if (listOnly) {
  for (const t of texts) console.log(enSlug(t).padEnd(44), t);
  console.log(texts.length + ' klip');
  process.exit(0);
}

async function ensureProfile() {
  const list = await (await fetch(BASE + '/profiles')).json();
  const found = list.find((p) => p.name === PROFILE_NAME);
  if (found) return found;
  const r = await fetch(BASE + '/profiles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: PROFILE_NAME, description: 'Ingilizce ek etkinlikler (Amerikan kadin)', language: 'en', voice_type: 'preset', preset_engine: 'kokoro', preset_voice_id: VOICE_ID, default_engine: 'kokoro' }),
  });
  if (!r.ok) throw new Error('profil olusturulamadi ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

async function generate(profile, text) {
  // Tek sözcüklerde doğal düşen tonlama için sona nokta (slug etkilenmez).
  const speakText = /[.!?]$/.test(text) ? text : text + '.';
  const r = await fetch(BASE + '/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profile.id, text: speakText, language: 'en', engine: 'kokoro' }),
  });
  if (!r.ok) throw new Error('generate ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const id = (await r.json()).id;
  for (let i = 0; i < 200; i++) {
    await sleep(1000);
    const h = await fetch(BASE + '/history/' + id);
    if (!h.ok) continue;
    const rec = await h.json();
    if (rec.status === 'completed') break;
    if (['failed', 'error', 'cancelled'].includes(rec.status)) throw new Error('uretim ' + rec.status + ': ' + (rec.error || ''));
    if (i === 199) throw new Error('zaman asimi');
  }
  const a = await fetch(BASE + '/audio/' + id);
  if (!a.ok) throw new Error('audio ' + a.status);
  const buf = Buffer.from(await a.arrayBuffer());
  if (buf.length < 1024 || buf.subarray(0, 4).toString('latin1') !== 'RIFF') throw new Error('gecersiz ses (' + buf.length + ' bayt)');
  return buf;
}

mkdirSync(OUT, { recursive: true });
const profile = await ensureProfile();
console.log('Profil:', profile.name, profile.id);
let yapilan = 0, atlanan = 0;
for (const text of texts) {
  const slug = enSlug(text);
  const wav = join(OUT, slug + '.wav');
  const mp3 = join(OUT, slug + '.mp3');
  if (!force && (existsSync(wav) || existsSync(mp3))) { atlanan++; continue; }
  const buf = await generate(profile, text);
  writeFileSync(wav, buf);
  yapilan++;
  console.log('tamam', slug, '(' + buf.length + ' bayt)');
}
console.log(`BİTTİ: ${yapilan} üretildi, ${atlanan} atlandı, toplam ${texts.length}`);
