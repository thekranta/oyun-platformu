/**
 * gen-earcons.mjs — doğru/yanlış geri bildirim earcon'larını saf Node ile sentezler
 * (ffmpeg/harici araç gerekmez). Okul öncesi için yumuşak, korkutmayan tonlar:
 *   correct.wav — parlak, yükselen iki nota (E5→G5, marimba benzeri)
 *   wrong.wav   — nazik, alçalan iki nota (A3→F3, yumuşak "olmadı" tonu; sert/ceza değil)
 * Çıktı: assets/sounds/sfx/*.wav (24kHz mono 16-bit — TTS klipleriyle aynı format).
 * Kullanım: node scripts/gen-earcons.mjs   (idempotent; üzerine yazar)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'sounds', 'sfx');
const SR = 24000;

function buildWav(samples) {
  const dataSize = samples.length * 2;
  const b = Buffer.alloc(44 + dataSize);
  b.write('RIFF', 0); b.writeUInt32LE(36 + dataSize, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    b.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return b;
}

/**
 * Nota dizisinden ton üretir. Her nota: { freq, ms, gainMul? }
 * attack: 8ms doğrusal; decay: üstel (tau); harmonic: 2. harmonik katkısı (parlaklık).
 */
function synth(notes, { gapMs = 20, tau = 0.09, harmonic = 0.3, peak = 0.4 }) {
  const parts = [];
  for (const n of notes) {
    const len = Math.round((n.ms / 1000) * SR);
    const attack = Math.round(0.008 * SR);
    const buf = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = (i < attack ? i / attack : 1) * Math.exp(-t / tau);
      const s = Math.sin(2 * Math.PI * n.freq * t) + harmonic * Math.sin(4 * Math.PI * n.freq * t);
      buf[i] = s * env * (n.gainMul ?? 1);
    }
    parts.push(buf, new Float64Array(Math.round((gapMs / 1000) * SR)));
  }
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float64Array(total + Math.round(0.05 * SR)); // 50ms kuyruk sessizliği
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  // normalize → peak
  let max = 1e-9;
  for (const v of out) max = Math.max(max, Math.abs(v));
  const g = peak / max;
  return Array.from(out, (v) => v * g);
}

mkdirSync(OUT_DIR, { recursive: true });

// Doğru: E5 → G5, parlak ve kısa (~0.45s)
const correct = synth(
  [{ freq: 659.25, ms: 120 }, { freq: 783.99, ms: 230 }],
  { gapMs: 15, tau: 0.1, harmonic: 0.3, peak: 0.42 }
);
writeFileSync(join(OUT_DIR, 'correct.wav'), buildWav(correct));

// Yanlış: A3 → F3, yumuşak ve nazik (~0.5s) — düşük, sinüs ağırlıklı
const wrong = synth(
  [{ freq: 220.0, ms: 150 }, { freq: 174.61, ms: 240, gainMul: 0.9 }],
  { gapMs: 25, tau: 0.13, harmonic: 0.08, peak: 0.3 }
);
writeFileSync(join(OUT_DIR, 'wrong.wav'), buildWav(wrong));

console.log('✅ assets/sounds/sfx/correct.wav + wrong.wav üretildi (24kHz mono 16-bit).');
