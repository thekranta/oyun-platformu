/**
 * compress-background.mjs — assets/sounds/background.mp3 (arka plan müziği) için daha küçük kodlama.
 * ffmpeg GEREKMEZ (mpg123-decoder WASM çözücü + @breezystack/lamejs kodlayıcı; compress-songs.mjs ile aynı araçlar).
 *
 * Neden: dosya web'de ilk dokunuştan sonra TAMAMEN iner (≈3,9 MB) ve ilk konuşma kliplerinin yolunu keser.
 * Müzik menüde 0,12 / oyunda 0,05 ses düzeyinde, konuşma sırasında kesilerek çalar (bkz. lib/musicPolicy.ts);
 * bu kullanım için yüksek bit hızı gereksiz.
 *
 * GÜVENLİK: dosya adı değişmez (lib/assetMap.ts aynen çalışır); çıktı yazılmadan önce geri çözülüp
 * süre sapması ve ses enerjisi (RMS) kaynakla karşılaştırılır; sapma ya da kazanç yoksa orijinale DOKUNULMAZ.
 * Zaten düşük bit hızlıysa (--skip-below, varsayılan 110 kbps) atlanır: yanlışlıkla ikinci kez çalıştırılsa
 * kayıp üst üste binmez (96 kbps çıktı bir sonraki çalıştırmada atlanır).
 * Varsayılan 96 kbps STEREO: müzik kutusu şarkılarıyla (compress-songs.mjs) aynı kalite; kanallar ve ses düzeyi korunur.
 *
 * Kullanım:
 *   node scripts/compress-background.mjs --dry              # yalnız rapor (96 kbps stereo)
 *   node scripts/compress-background.mjs                    # 96 kbps stereo, dosyanın üstüne yazar
 *   node scripts/compress-background.mjs --kbps 64 --mono   # daha küçük: tek kanala indirir (≈%2 dB daha kısık)
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';
import { MPEGDecoder } from 'mpg123-decoder';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '..', 'assets', 'sounds', 'background.mp3');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const monoOut = argv.includes('--mono');
const num = (flag, def) => { const i = argv.indexOf(flag); return i >= 0 ? parseInt(argv[i + 1], 10) : def; };
const KBPS = num('--kbps', 96);
const SKIP_BELOW = num('--skip-below', 110);

const mb = (b) => `${(b / (1024 * 1024)).toFixed(2)} MB`;

async function decode(buf) {
  const d = new MPEGDecoder();
  await d.ready;
  const r = d.decode(new Uint8Array(buf));
  d.free();
  return r; // { channelData: Float32Array[], samplesDecoded, sampleRate }
}

function rms(channelData) {
  let sum = 0, n = 0;
  for (const ch of channelData) for (let i = 0; i < ch.length; i += 16) { sum += ch[i] * ch[i]; n++; }
  return n ? Math.sqrt(sum / n) : 0;
}

function peak(channelData) {
  let p = 0;
  for (const ch of channelData) for (let i = 0; i < ch.length; i += 4) { const a = Math.abs(ch[i]); if (a > p) p = a; }
  return p;
}

function floatToInt16(f32) {
  const out = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const v = Math.max(-1, Math.min(1, f32[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

/** İki kanalı ortalayıp tek kanala indirir (telefon hoparlörü zaten mono çalar). */
function toMono(channelData) {
  if (channelData.length < 2) return channelData;
  const [l, r] = channelData;
  const m = new Float32Array(l.length);
  for (let i = 0; i < m.length; i++) m[i] = (l[i] + r[i]) * 0.5;
  return [m];
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

const srcBuf = readFileSync(FILE);
const src = await decode(srcBuf);
const durSec = src.samplesDecoded / src.sampleRate;
if (!durSec || durSec < 1) throw new Error('çözülemedi / süre yok');
const srcKbps = Math.round((srcBuf.length * 8) / durSec / 1000);
console.log(`kaynak: ${mb(srcBuf.length)} · ${durSec.toFixed(1)} sn · ${src.sampleRate} Hz · ${src.channelData.length} kanal · ~${srcKbps} kbps · RMS ${rms(src.channelData).toFixed(4)} · tepe ${peak(src.channelData).toFixed(3)}`);

if (srcKbps <= SKIP_BELOW) {
  console.log(`~${srcKbps} kbps ≤ ${SKIP_BELOW} — atlandı (zaten düşük).`);
  process.exit(0);
}

const input = monoOut ? { ...src, channelData: toMono(src.channelData) } : src;
const out = encodeMp3(input, KBPS);
if (out.length >= srcBuf.length) { console.log('kazanç yok — orijinale dokunulmadı.'); process.exit(0); }

const check = await decode(out);
const outDur = check.samplesDecoded / check.sampleRate;
const drift = Math.abs(outDur - durSec);
if (drift > 0.5) throw new Error(`süre sapması ${drift.toFixed(2)}s — orijinal korundu`);
const rSrc = rms(input.channelData), rOut = rms(check.channelData);
const sapma = rSrc > 1e-6 ? Math.abs(rOut - rSrc) / rSrc : 0;
if (sapma > 0.15) throw new Error(`ses enerjisi %${(sapma * 100).toFixed(0)} saptı — orijinal korundu`);

console.log(`çıktı:  ${mb(out.length)} · ${outDur.toFixed(1)} sn · ${check.sampleRate} Hz · ${check.channelData.length} kanal · ${KBPS} kbps · RMS ${rOut.toFixed(4)} (sapma %${(sapma * 100).toFixed(1)}) · tepe ${peak(check.channelData).toFixed(3)}`);
console.log(`kazanç: ${mb(srcBuf.length)} → ${mb(out.length)} (%${((1 - out.length / srcBuf.length) * 100).toFixed(0)} küçüldü)`);

if (dry) { console.log('DRY — dosyaya dokunulmadı.'); process.exit(0); }
writeFileSync(FILE, out);
if (statSync(FILE).size !== out.length) throw new Error('yazma doğrulanamadı');
console.log('yazıldı.');
