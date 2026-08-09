/**
 * compress-voices.mjs — TTS konuşma kliplerini WAV'dan MP3'e çevirir.
 * ffmpeg GEREKMEZ (saf JS kodlayıcı: @breezystack/lamejs).
 *
 * Neden: klipler 24 kHz mono 16-bit WAV olarak saklanıyordu (~48 KB/sn) ve her yeni
 * oyun turunda büyüyordu. Konuşma için 64 kbps mono MP3 kalite kaybı hissettirmeden
 * ~6 kat küçültür — web yüklemesi ve mobil paket boyutu için kritik.
 *
 * Güvenli ve yeniden çalıştırılabilir (idempotent):
 *   - .mp3 yazılıp boyutu doğrulanmadan .wav SİLİNMEZ
 *   - zaten .mp3 olan (ve .wav'ı gitmiş) klipler atlanır
 *   - lib/ttsAssets.ts üreticisi aynı slug'ta .mp3'ü .wav'a TERCİH eder,
 *     yani yarım kalan bir çalıştırma bile sistemi bozmaz
 *
 * Kullanım:
 *   node scripts/compress-voices.mjs            # assets/sounds/tts → mp3
 *   node scripts/compress-voices.mjs --dry      # yalnız rapor, dosyaya dokunma
 *   node scripts/compress-voices.mjs --kbps 48  # bit hızı (varsayılan 64)
 * Sonra: node scripts/gen-tts-assets.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TTS_DIR = join(__dirname, '..', 'assets', 'sounds', 'tts');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const kbpsArg = argv.indexOf('--kbps');
const KBPS = kbpsArg >= 0 ? parseInt(argv[kbpsArg + 1], 10) : 64;

/** Minimal WAV okuyucu (PCM 16-bit). trim-voices.mjs ile aynı yaklaşım. */
function parseWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF') throw new Error('RIFF değil');
  let off = 12, fmt = null, dataOff = -1, dataSize = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString('latin1', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      fmt = { channels: buf.readUInt16LE(off + 10), sampleRate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) };
    } else if (id === 'data') { dataOff = off + 8; dataSize = size; break; }
    off += 8 + size + (size & 1);
  }
  if (!fmt || dataOff < 0) throw new Error('fmt/data yok');
  return { ...fmt, dataOff, dataSize };
}

function wavToMp3(buf, kbps) {
  const w = parseWav(buf);
  if (w.bits !== 16) throw new Error(`beklenmedik bit derinliği: ${w.bits}`);
  const n = Math.floor(w.dataSize / 2 / w.channels);
  // Çok kanallı gelirse mono'ya indir (bu hatta hepsi zaten mono).
  const mono = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    if (w.channels === 1) {
      mono[i] = buf.readInt16LE(w.dataOff + i * 2);
    } else {
      let s = 0;
      for (let c = 0; c < w.channels; c++) s += buf.readInt16LE(w.dataOff + (i * w.channels + c) * 2);
      mono[i] = Math.round(s / w.channels);
    }
  }
  const encoder = new Mp3Encoder(1, w.sampleRate, kbps);
  const parts = [];
  const BLOCK = 1152; // MP3 çerçeve boyutu
  for (let i = 0; i < mono.length; i += BLOCK) {
    const chunk = mono.subarray(i, Math.min(i + BLOCK, mono.length));
    const out = encoder.encodeBuffer(chunk);
    if (out.length > 0) parts.push(Buffer.from(out));
  }
  const tail = encoder.flush();
  if (tail.length > 0) parts.push(Buffer.from(tail));
  return Buffer.concat(parts);
}

const mb = (b) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

if (!existsSync(TTS_DIR)) {
  console.error('assets/sounds/tts bulunamadı:', TTS_DIR);
  process.exit(1);
}

const wavs = readdirSync(TTS_DIR).filter((f) => f.endsWith('.wav')).sort();
const mp3sAlready = readdirSync(TTS_DIR).filter((f) => f.endsWith('.mp3')).length;

if (wavs.length === 0) {
  console.log(`Yapılacak iş yok: .wav kalmamış (${mp3sAlready} .mp3 mevcut).`);
  process.exit(0);
}

console.log(`${wavs.length} WAV bulundu (${mp3sAlready} MP3 zaten var). Bit hızı: ${KBPS} kbps mono.\n`);

let before = 0, after = 0, ok = 0, fail = 0;
for (let i = 0; i < wavs.length; i++) {
  const f = wavs[i];
  const src = join(TTS_DIR, f);
  const dest = src.slice(0, -4) + '.mp3';
  const srcSize = statSync(src).size;
  before += srcSize;
  try {
    const mp3 = wavToMp3(readFileSync(src), KBPS);
    if (mp3.length < 256) throw new Error('şüpheli küçük çıktı');
    after += mp3.length;
    if (!dry) {
      writeFileSync(dest, mp3);
      // Yalnızca yazma doğrulandıktan SONRA kaynağı sil.
      if (statSync(dest).size === mp3.length) unlinkSync(src);
      else throw new Error('yazma doğrulanamadı, .wav korundu');
    }
    ok++;
    if ((i + 1) % 100 === 0 || i === wavs.length - 1) {
      console.log(`  ${i + 1}/${wavs.length} işlendi…`);
    }
  } catch (e) {
    console.log(`  ❌ ${f}: ${e.message}`);
    after += srcSize; // kalıyor
    fail++;
  }
}

console.log(`\n${ok} klip dönüştürüldü, ${fail} hata${dry ? ' (DRY — dosyaya dokunulmadı)' : ''}.`);
console.log(`Boyut: ${mb(before)} → ${mb(after)}  (${((1 - after / before) * 100).toFixed(0)}% küçüldü)`);
console.log('\nŞimdi: node scripts/gen-tts-assets.mjs');
if (fail > 0) process.exitCode = 1;
