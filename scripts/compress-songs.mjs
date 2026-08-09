/**
 * compress-songs.mjs — Müzik kutusu şarkılarını daha düşük bit hızında yeniden kodlar.
 * ffmpeg GEREKMEZ (mpg123-decoder WASM çözücü + @breezystack/lamejs kodlayıcı).
 *
 * Neden: 42 şarkı ~194 kbps stereo / 143 MB. Telefon-tablet hoparlöründe dinlenen
 * çocuk şarkıları için bu gereğinden yüksek; 96 kbps'e inince ~%50 yer kazanılır.
 * Mobil paket boyutu için kritik (Play Store AAB taban sınırı 150 MB).
 *
 * ÖNEMLİ GÜVENLİK ÖZELLİKLERİ:
 *   1) DOSYA ADI DEĞİŞMEZ → lib/assetMap.ts require yolları aynen çalışır.
 *   2) Zaten düşük bit hızlı dosyalar ATLANIR (--skip-below, varsayılan 110 kbps).
 *      Bu, script yanlışlıkla ikinci kez çalıştırılsa bile kaybın ÜST ÜSTE
 *      binmesini engeller (lossy→lossy→lossy). Idempotent davranışın temeli budur.
 *   3) Çıktı, yazılmadan ÖNCE geri çözülüp DOĞRULANIR: süre sapması ve ortalama
 *      ses enerjisi (RMS) kaynakla karşılaştırılır; sapma varsa orijinale DOKUNULMAZ.
 *      NOT: LAME düşük bit hızında örnekleme hızını bilinçli düşürür (48→32 kHz);
 *      bu bozulma değil, kalite tercihidir — bu yüzden yalnız RAPORLANIR, engellenmez.
 *   4) Çıktı beklenenden büyükse (kazanç yoksa) orijinal korunur.
 *
 * Kullanım:
 *   node scripts/compress-songs.mjs                 # 96 kbps
 *   node scripts/compress-songs.mjs --kbps 128
 *   node scripts/compress-songs.mjs --dry           # yalnız rapor
 *   node scripts/compress-songs.mjs --only ADIL     # ad filtresi (deneme için)
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';
import { MPEGDecoder } from 'mpg123-decoder';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = join(__dirname, '..', 'assets', 'sounds', 'songs');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const num = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 ? parseInt(argv[i + 1], 10) : def; };
const str = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const KBPS = num('--kbps', 96);
const SKIP_BELOW = num('--skip-below', 110);
const ONLY = str('--only');

const mb = (b) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

async function decode(buf) {
  const d = new MPEGDecoder();
  await d.ready;
  const r = d.decode(new Uint8Array(buf));
  d.free();
  return r; // { channelData: Float32Array[], samplesDecoded, sampleRate }
}

/** Ortalama ses enerjisi — sessizleşme/bozulma yakalamak için (örnekleme hızından bağımsız). */
function rms(channelData) {
  let sum = 0, n = 0;
  for (const ch of channelData) {
    // Büyük dosyalarda hız için seyrek örnekle (her 16. örnek yeterli).
    for (let i = 0; i < ch.length; i += 16) { sum += ch[i] * ch[i]; n++; }
  }
  return n ? Math.sqrt(sum / n) : 0;
}

function floatToInt16(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const v = Math.max(-1, Math.min(1, f32[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

function encodeMp3({ channelData, sampleRate }, kbps) {
  const stereo = channelData.length > 1;
  const left = floatToInt16(channelData[0]);
  const right = stereo ? floatToInt16(channelData[1]) : null;
  const encoder = new Mp3Encoder(stereo ? 2 : 1, sampleRate, kbps);
  const parts = [];
  const BLOCK = 1152;
  for (let i = 0; i < left.length; i += BLOCK) {
    const end = Math.min(i + BLOCK, left.length);
    const out = stereo
      ? encoder.encodeBuffer(left.subarray(i, end), right.subarray(i, end))
      : encoder.encodeBuffer(left.subarray(i, end));
    if (out.length > 0) parts.push(Buffer.from(out));
  }
  const tail = encoder.flush();
  if (tail.length > 0) parts.push(Buffer.from(tail));
  return Buffer.concat(parts);
}

const files = readdirSync(SONGS_DIR)
  .filter((f) => f.toLowerCase().endsWith('.mp3'))
  .filter((f) => !ONLY || f.toUpperCase().includes(ONLY.toUpperCase()))
  .sort();

if (files.length === 0) { console.log('Şarkı bulunamadı.'); process.exit(0); }

console.log(`${files.length} şarkı · hedef ${KBPS} kbps · ${SKIP_BELOW} kbps altındakiler atlanır${dry ? ' · DRY' : ''}\n`);

let before = 0, after = 0, done = 0, skipped = 0, failed = 0;

for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const p = join(SONGS_DIR, f);
  const srcBuf = readFileSync(p);
  const srcSize = srcBuf.length;
  before += srcSize;
  const label = `[${i + 1}/${files.length}] ${f.slice(0, 34).padEnd(36)}`;

  try {
    const src = await decode(srcBuf);
    const durSec = src.samplesDecoded / src.sampleRate;
    if (!durSec || durSec < 1) throw new Error('çözülemedi / süre yok');
    const srcKbps = Math.round((srcSize * 8) / durSec / 1000);

    // (2) Zaten düşük bit hızlıysa dokunma — tekrar tekrar kodlamayı önler.
    if (srcKbps <= SKIP_BELOW) {
      console.log(`${label} ${srcKbps} kbps — atlandı (zaten düşük)`);
      after += srcSize; skipped++; continue;
    }

    const out = encodeMp3(src, KBPS);

    // (4) Kazanç yoksa dokunma.
    if (out.length >= srcSize) {
      console.log(`${label} kazanç yok — atlandı`);
      after += srcSize; skipped++; continue;
    }

    // (3) Yazmadan önce çıktıyı geri çözüp doğrula: süre + ses enerjisi.
    const check = await decode(out);
    const outDur = check.samplesDecoded / check.sampleRate;
    const drift = Math.abs(outDur - durSec);
    if (drift > 0.5) throw new Error(`süre sapması ${drift.toFixed(2)}s — orijinal korundu`);
    if (check.channelData.length !== src.channelData.length) throw new Error('kanal sayısı değişti — orijinal korundu');
    const rSrc = rms(src.channelData), rOut = rms(check.channelData);
    if (rSrc > 1e-6) {
      const sapma = Math.abs(rOut - rSrc) / rSrc;
      if (sapma > 0.15) throw new Error(`ses enerjisi %${(sapma * 100).toFixed(0)} saptı — orijinal korundu`);
    }
    // LAME düşük bit hızında örnekleme hızını bilinçli düşürür — bozulma değil, raporla.
    const srNot = check.sampleRate !== src.sampleRate ? ` [${src.sampleRate / 1000}→${check.sampleRate / 1000} kHz]` : '';

    if (!dry) {
      writeFileSync(p, out);
      if (statSync(p).size !== out.length) throw new Error('yazma doğrulanamadı');
    }
    after += out.length;
    done++;
    console.log(`${label} ${srcKbps}→${KBPS} kbps  ${mb(srcSize)} → ${mb(out.length)}  (${Math.round(durSec)}s ✓)${srNot}`);
  } catch (e) {
    console.log(`${label} ❌ ${e.message}`);
    after += srcSize; failed++;
  }
}

console.log(`\n${done} yeniden kodlandı, ${skipped} atlandı, ${failed} hata${dry ? ' (DRY — dosyaya dokunulmadı)' : ''}.`);
console.log(`Boyut: ${mb(before)} → ${mb(after)}  (${((1 - after / before) * 100).toFixed(0)}% küçüldü)`);
if (failed > 0) process.exitCode = 1;
