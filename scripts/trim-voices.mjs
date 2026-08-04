/**
 * trim-voices.mjs — TTS kliplerindeki konuşma-sonrası artefaktı/uğultuyu/sessizliği kırpar.
 * ffmpeg GEREKMEZ (saf Node, WAV PCM işler).
 *
 * Chatterbox bazen konuşmadan sonra 0.5-2 sn'lik robotik bir kuyruk üretir. Bu script
 * ana konuşmanın bittiği noktayı bulur (doğal duraklamaları koruyarak) ve sonrasını
 * küçük bir kuyruk + fade-out ile atar.
 *
 * Kullanım:
 *   node scripts/trim-voices.mjs                      # assets/sounds/tts/*.wav → yerinde kırp
 *   node scripts/trim-voices.mjs --demo <outdir> a.wav b.wav   # sadece demo (yerinde değil)
 *   node scripts/trim-voices.mjs --dry                # ne olacağını yaz, dosyaya dokunma
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TTS_DIR = join(__dirname, '..', 'assets', 'sounds', 'tts');

// ---- WAV yardımcıları ----
function parseWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF') throw new Error('RIFF değil');
  let off = 12, fmt = null, dataOff = -1, dataSize = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString('latin1', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { channels: buf.readUInt16LE(off + 10), sampleRate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    else if (id === 'data') { dataOff = off + 8; dataSize = size; break; }
    off += 8 + size + (size & 1);
  }
  if (!fmt || dataOff < 0) throw new Error('fmt/data yok');
  return { ...fmt, dataOff, dataSize };
}

function buildWav(sr, samples) {
  const dataSize = samples.length * 2;
  const b = Buffer.alloc(44 + dataSize);
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataSize, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, samples[i])), 44 + i * 2);
  return b;
}

/**
 * Ana konuşmanın bittiği örnek indeksini bulur.
 * Doğal duraklama (<0.5s) → devam; büyük boşluk sonrası kısa/uzak parça → artefakt (kes).
 */
function findSpeechEnd(buf, w) {
  const sr = w.sampleRate, n = Math.floor(w.dataSize / 2);
  const winN = Math.floor(sr * 0.025); // 25ms
  const rms = [];
  for (let i = 0; i < n; i += winN) {
    let s = 0, c = 0;
    for (let j = i; j < Math.min(i + winN, n); j++) { const v = buf.readInt16LE(w.dataOff + j * 2) / 32768; s += v * v; c++; }
    rms.push(Math.sqrt(s / c));
  }
  const peak = Math.max(...rms, 1e-9);
  const thr = Math.max(peak * 0.06, 0.006);
  const voiced = rms.map((r) => r > thr);
  const toS = (win) => win * 0.025;
  // ince segmentler (boşluk < 150ms birleşir)
  const mergeWin = Math.ceil(150 / 25);
  const segs = [];
  let i = 0;
  while (i < voiced.length) {
    if (!voiced[i]) { i++; continue; }
    let j = i;
    while (j < voiced.length) {
      if (voiced[j]) { j++; continue; }
      let k = j; while (k < voiced.length && !voiced[k]) k++;
      if (k - j < mergeWin && k < voiced.length) j = k; else break;
    }
    segs.push([toS(i), toS(j)]);
    i = j;
  }
  if (!segs.length) return n; // konuşma yok gibi → dokunma
  let cut = segs[0][1];
  for (let s = 1; s < segs.length; s++) {
    const gap = segs[s][0] - segs[s - 1][1];
    const len = segs[s][1] - segs[s][0];
    if (gap < 0.5) cut = segs[s][1];                         // doğal duraklama
    else if (gap < 0.75 && len >= 0.6) cut = segs[s][1];     // uzun duraklama ama gerçek konuşma
    else break;                                              // artefakt → dur
  }
  return Math.min(n, Math.round((cut + 0.15) * sr)); // +150ms kuyruk
}

function trimWav(buf) {
  const w = parseWav(buf);
  if (w.bits !== 16 || w.channels !== 1) return { buf, changed: false }; // beklenmedik format → dokunma
  const sr = w.sampleRate, n = Math.floor(w.dataSize / 2);
  const end = findSpeechEnd(buf, w);
  if (end >= n - Math.floor(sr * 0.05)) return { buf, changed: false, oldDur: n / sr, newDur: n / sr };
  const out = new Int16Array(end);
  for (let i = 0; i < end; i++) out[i] = buf.readInt16LE(w.dataOff + i * 2);
  // fade-out son 60ms
  const fade = Math.min(Math.floor(sr * 0.06), end);
  for (let i = 0; i < fade; i++) out[end - fade + i] = Math.round(out[end - fade + i] * (1 - i / fade));
  return { buf: buildWav(sr, out), changed: true, oldDur: n / sr, newDur: end / sr };
}

// ---- CLI ----
const argv = process.argv.slice(2);
let demoDir = null, dry = false;
const fileArgs = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--demo') demoDir = argv[++i];
  else if (argv[i] === '--dry') dry = true;
  else fileArgs.push(argv[i]);
}

const files = (fileArgs.length ? fileArgs.map((f) => basename(f)) : readdirSync(TTS_DIR).filter((f) => f.endsWith('.wav'))).sort();
if (demoDir && !existsSync(demoDir)) mkdirSync(demoDir, { recursive: true });

let changed = 0, savedMs = 0;
for (const f of files) {
  const src = join(TTS_DIR, f);
  if (!existsSync(src)) { console.log('yok:', f); continue; }
  let res;
  try { res = trimWav(readFileSync(src)); } catch (e) { console.log(`HATA ${f}: ${e.message}`); continue; }
  if (!res.changed) continue;
  changed++;
  savedMs += (res.oldDur - res.newDur) * 1000;
  const tag = `${f}  ${res.oldDur.toFixed(2)}s → ${res.newDur.toFixed(2)}s  (-${((res.oldDur - res.newDur) * 1000).toFixed(0)}ms)`;
  if (dry) { console.log('DRY ' + tag); continue; }
  const dest = demoDir ? join(demoDir, f) : src;
  writeFileSync(dest, res.buf);
  console.log((demoDir ? 'DEMO ' : 'KIRP ') + tag);
}
console.log(`\n${changed} klip kırpıldı, toplam ${(savedMs / 1000).toFixed(1)}s kuyruk atıldı${dry ? ' (dry - yazılmadı)' : ''}.`);
