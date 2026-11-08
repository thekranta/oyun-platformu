/**
 * recompress-songs-mono.mjs — Şarkıları ORİJİNAL kaynaktan (git geçmişi) tek kanal 64 kbps'e kodlar.
 *
 * Neden: Play AAB'si ~203 MB, taban modül sınırı 200 MB. Şarkılar 96 kbps stereo (71 MB).
 * Telefon/tablet hoparlöründe dinlenen çocuk şarkıları için tek kanal 64 kbps yeterli ve
 * 96 kbps stereo'nun mevcut hâlinden tekrar sıkıştırmaya göre (lossy→lossy) daha temiz sonuç verir,
 * çünkü kaynak olarak 08013d9c^ (194 kbps) kullanılır.
 *
 * Güvenlik: dosya adı değişmez; çıktı yazılmadan önce geri çözülüp süre/ses enerjisi doğrulanır;
 * kazanç yoksa ya da doğrulama başarısızsa mevcut dosyaya dokunulmaz.
 *
 * Kullanım:
 *   node scripts/recompress-songs-mono.mjs --dry
 *   node scripts/recompress-songs-mono.mjs
 *   node scripts/recompress-songs-mono.mjs --kbps 80 --only ADIL
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';
import { MPEGDecoder } from 'mpg123-decoder';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SONGS_DIR = join(ROOT, 'assets', 'sounds', 'songs');
const SRC_COMMIT = '08013d9c^'; // şarkıların 96 kbps'e indirildiği commit'in öncesi (194 kbps kaynak)

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const num = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 ? parseInt(argv[i + 1], 10) : def; };
const str = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const KBPS = num('--kbps', 64);
const ONLY = str('--only');
const mb = (b) => `${(b / (1024 * 1024)).toFixed(2)} MB`;

async function decode(buf) {
  const d = new MPEGDecoder();
  await d.ready;
  const r = d.decode(new Uint8Array(buf));
  d.free();
  return r;
}

function toMono(channelData) {
  if (channelData.length === 1) return channelData[0];
  const [l, r] = channelData;
  const m = new Float32Array(l.length);
  for (let i = 0; i < l.length; i++) m[i] = (l[i] + r[i]) * 0.5;
  return m;
}

function rms(f32) {
  let sum = 0, n = 0;
  for (let i = 0; i < f32.length; i += 16) { sum += f32[i] * f32[i]; n++; }
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

function encodeMono(mono, sampleRate, kbps) {
  const pcm = floatToInt16(mono);
  const enc = new Mp3Encoder(1, sampleRate, kbps);
  const parts = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const out = enc.encodeBuffer(pcm.subarray(i, Math.min(i + 1152, pcm.length)));
    if (out.length) parts.push(Buffer.from(out));
  }
  const tail = enc.flush();
  if (tail.length) parts.push(Buffer.from(tail));
  return Buffer.concat(parts);
}

/** İlk MPEG çerçeve başlığından kanal kipini oku (11 = tek kanal). Çözücü tek kanalı da 2 kanal verebilir. */
function isMonoMp3(buf) {
  let i = 0;
  while (i < buf.length - 4 && !(buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0)) i++;
  return ((buf[i + 3] >> 6) & 3) === 3;
}

function original(file) {
  try {
    return execFileSync('git', ['show', `${SRC_COMMIT}:assets/sounds/songs/${file}`], {
      cwd: ROOT, maxBuffer: 256 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

const files = readdirSync(SONGS_DIR)
  .filter((f) => f.toLowerCase().endsWith('.mp3'))
  .filter((f) => !ONLY || f.toUpperCase().includes(ONLY.toUpperCase()))
  .sort();

console.log(`${files.length} şarkı · tek kanal ${KBPS} kbps · kaynak ${SRC_COMMIT}${dry ? ' · DRY' : ''}\n`);

let before = 0, after = 0, done = 0, skipped = 0, failed = 0;
for (let i = 0; i < files.length; i++) {
  const f = files[i];
  const p = join(SONGS_DIR, f);
  const curSize = statSync(p).size;
  before += curSize;
  const label = `[${i + 1}/${files.length}] ${f.slice(0, 32).padEnd(34)}`;
  try {
    const srcBuf = original(f);
    if (!srcBuf) { console.log(`${label} kaynak geçmişte yok — atlandı`); after += curSize; skipped++; continue; }
    const src = await decode(srcBuf);
    const dur = src.samplesDecoded / src.sampleRate;
    if (!dur || dur < 1) throw new Error('kaynak çözülemedi');
    const mono = toMono(src.channelData);
    const out = encodeMono(mono, src.sampleRate, KBPS);
    if (out.length >= curSize) { console.log(`${label} kazanç yok — atlandı`); after += curSize; skipped++; continue; }
    const check = await decode(out);
    const outDur = check.samplesDecoded / check.sampleRate;
    if (Math.abs(outDur - dur) > 0.5) throw new Error(`süre sapması ${(outDur - dur).toFixed(2)}s`);
    if (!isMonoMp3(out)) throw new Error('çıktı tek kanal değil');
    const r0 = rms(mono), r1 = rms(check.channelData[0]);
    if (r0 > 1e-6 && Math.abs(r1 - r0) / r0 > 0.15) throw new Error(`ses enerjisi %${(Math.abs(r1 - r0) / r0 * 100).toFixed(0)} saptı`);
    if (!dry) {
      writeFileSync(p, out);
      if (statSync(p).size !== out.length) throw new Error('yazma doğrulanamadı');
    }
    after += out.length; done++;
    console.log(`${label} ${mb(curSize)} → ${mb(out.length)}  (${Math.round(dur)}s ✓ ${src.sampleRate / 1000}→${check.sampleRate / 1000} kHz)`);
  } catch (e) {
    console.log(`${label} ❌ ${e.message}`);
    after += curSize; failed++;
  }
}
console.log(`\n${done} yeniden kodlandı, ${skipped} atlandı, ${failed} hata${dry ? ' (DRY)' : ''}.`);
console.log(`Boyut: ${mb(before)} → ${mb(after)}  (${((1 - after / before) * 100).toFixed(0)}% küçüldü)`);
if (failed > 0) process.exitCode = 1;
