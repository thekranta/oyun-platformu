/**
 * make-profile.mjs — VoiceBox'ta yeni bir klon profili oluşturur ve verilen ses
 * dosyalarını örnek olarak ekler. Yeni profilin id'sini yazar.
 *
 * VoiceBox açık olmalı (127.0.0.1:17493).
 *
 * Kullanım:
 *   node scripts/make-profile.mjs                          # varsayılan 3 coral örneği
 *   node scripts/make-profile.mjs --name "Hikaye Sesi" a.mp3 b.mp3   # özel
 *
 * NOT: chatterbox referans SESTEN klonlar; reference_text nötr olabilir.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = process.env.VOICEBOX_URL || 'http://127.0.0.1:17493';

// Aynı hikayeden (aynı coral sesi/ayarı) 3 temiz, iyi uzunlukta örnek
const DEFAULT_SAMPLES = [
  'assets/sounds/stories/adalet_hikayesi/s02_giris_narr.mp3',
  'assets/sounds/stories/adalet_hikayesi/s02_giris_narr_2.mp3',
  'assets/sounds/stories/adalet_hikayesi/s02_yola_narr.mp3',
];
const REF_TEXT = 'Türkçe çocuk hikâyesi anlatımı örneğidir.';

const argv = process.argv.slice(2);
let name = 'Hikaye Sesi';
const samples = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--name') name = argv[++i];
  else samples.push(argv[i]);
}
const sampleList = samples.length ? samples : DEFAULT_SAMPLES;

async function main() {
  const cp = await fetch(BASE + '/profiles', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name, description: 'Coral anlatımından klon (karşılaştırma)',
      language: 'tr', voice_type: 'cloned', default_engine: 'chatterbox',
    }),
  });
  if (!cp.ok) { console.error('profil oluşturulamadı:', cp.status, await cp.text()); process.exit(1); }
  const profile = await cp.json();
  console.log('Profil oluşturuldu:', profile.id, '|', profile.name);

  let ok = 0;
  for (const rel of sampleList) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) { console.log('  yok, atlandı:', rel); continue; }
    const buf = readFileSync(abs);
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: 'audio/mpeg' }), basename(rel));
    fd.append('reference_text', REF_TEXT);
    const r = await fetch(`${BASE}/profiles/${profile.id}/samples`, { method: 'POST', body: fd });
    const t = await r.text();
    console.log(`  örnek ${basename(rel)} -> HTTP ${r.status}  ${t.slice(0, 90)}`);
    if (r.ok) ok++;
  }
  console.log(`\n${ok}/${sampleList.length} örnek eklendi.`);
  console.log('NEW_PROFILE_ID=' + profile.id);
}
main().catch((e) => { console.error('HATA:', e.message); process.exit(1); });
