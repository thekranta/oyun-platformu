/**
 * compress-sfx.mjs — Ses efektlerini (assets/sounds/sfx) WAV'dan MP3'e cevirir.
 * compress-voices.mjs ile ayni yaklasim (ffmpeg gerekmez, @breezystack/lamejs),
 * sadece hedef klasor sfx/ ve varsayilan bit hizi efektler icin biraz daha
 * yuksek (96 kbps — kisa vurmali seslerde 64 kbps'te fark edilebilir artefakt
 * olusabiliyor).
 *
 * lib/assetMap.ts'teki require() satirlari BU SCRIPT TARAFINDAN OTOMATIK
 * GUNCELLENMEZ — donusum sonrasi elle (veya bu dosyanin ikinci yarisindaki
 * updateAssetMap() ile) .wav -> .mp3 olarak duzeltilmesi gerekir.
 *
 * Kullanim:
 *   node scripts/compress-sfx.mjs            # donustur + assetMap.ts guncelle
 *   node scripts/compress-sfx.mjs --dry       # yalniz rapor
 */
import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SFX_DIR = join(__dirname, '..', 'assets', 'sounds', 'sfx');
const ASSET_MAP_PATH = join(__dirname, '..', 'lib', 'assetMap.ts');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const KBPS = 96;

function parseWav(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF') throw new Error('RIFF degil');
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
  if (w.bits !== 16) throw new Error(`beklenmedik bit derinligi: ${w.bits}`);
  const n = Math.floor(w.dataSize / 2 / w.channels);
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
  const BLOCK = 1152;
  for (let i = 0; i < mono.length; i += BLOCK) {
    const chunk = mono.subarray(i, Math.min(i + BLOCK, mono.length));
    const out = encoder.encodeBuffer(chunk);
    if (out.length > 0) parts.push(Buffer.from(out));
  }
  const tail = encoder.flush();
  if (tail.length > 0) parts.push(Buffer.from(tail));
  return Buffer.concat(parts);
}

const mb = (b) => `${(b / 1024).toFixed(1)} KB`;

if (!existsSync(SFX_DIR)) {
  console.error('assets/sounds/sfx bulunamadi:', SFX_DIR);
  process.exit(1);
}

const wavs = readdirSync(SFX_DIR).filter((f) => f.endsWith('.wav')).sort();
if (wavs.length === 0) {
  console.log('Yapilacak is yok: .wav kalmamis.');
  process.exit(0);
}

console.log(`${wavs.length} WAV bulundu. Bit hizi: ${KBPS} kbps mono.\n`);

let before = 0, after = 0, ok = 0, fail = 0;
const converted = []; // { base } basari ile donusturulenler
for (const f of wavs) {
  const src = join(SFX_DIR, f);
  const dest = src.slice(0, -4) + '.mp3';
  const srcSize = statSync(src).size;
  before += srcSize;
  try {
    const mp3 = wavToMp3(readFileSync(src), KBPS);
    if (mp3.length < 64) throw new Error('supheli kucuk cikti');
    after += mp3.length;
    if (!dry) {
      writeFileSync(dest, mp3);
      if (statSync(dest).size !== mp3.length) throw new Error('yazma dogrulanamadi, .wav korundu');
      unlinkSync(src);
    }
    converted.push(f.slice(0, -4));
    ok++;
    console.log(`  ✓ ${f} (${mb(srcSize)} → ${mb(mp3.length)})`);
  } catch (e) {
    console.log(`  ❌ ${f}: ${e.message}`);
    after += srcSize;
    fail++;
  }
}

console.log(`\n${ok} dosya donusturuldu, ${fail} hata${dry ? ' (DRY — dosyaya dokunulmadi)' : ''}.`);
console.log(`Boyut: ${mb(before)} → ${mb(after)}  (${((1 - after / before) * 100).toFixed(0)}% kuculdu)`);

if (!dry && converted.length > 0) {
  let mapSrc = readFileSync(ASSET_MAP_PATH, 'utf8');
  let mapUpdates = 0;
  for (const base of converted) {
    const re = new RegExp(
      `(require\\('\\.\\./assets/sounds/sfx/${base})\\.wav'\\)`,
      'g',
    );
    const next = mapSrc.replace(re, "$1.mp3')");
    if (next !== mapSrc) { mapUpdates++; mapSrc = next; }
  }
  writeFileSync(ASSET_MAP_PATH, mapSrc);
  console.log(`lib/assetMap.ts: ${mapUpdates} require() yolu .mp3'e guncellendi.`);
}
