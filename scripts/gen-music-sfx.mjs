/**
 * gen-music-sfx.mjs — Müzik oyunları için çalgı sesleri ve ezgi motifleri üretir.
 * Saf Node WAV sentezi; ffmpeg/örnekleme kaydı GEREKMEZ (gen-earcons.mjs'in genişletilmiş hali).
 *
 * Üretilenler → assets/sounds/sfx/ (24 kHz mono 16-bit, TTS klipleriyle aynı format):
 *   Çalgı tınıları  : davul, zil, marakas, tahta  (+ davul-kuvvetli / davul-hafif)
 *   Tempo/sayaç     : metronom, tik, tik-hizli, bitti
 *   Ezgi motifleri  : motif-yavas/hizli, motif-kisik/yuksek, motif-kalin/ince, motif-cikan/inen
 *
 * Kullanım: node scripts/gen-music-sfx.mjs   (idempotent; üzerine yazar)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'sounds', 'sfx');
const SR = 24000;

// ---- WAV yazıcı (gen-earcons.mjs ile aynı) ----
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

const secs = (ms) => Math.round((ms / 1000) * SR);

/** Deterministik gürültü (her çalıştırmada aynı dosya çıksın diye Math.random yok). */
function makeNoise() {
  let seed = 1337;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };
}

/**
 * Tek bir vuruş/nota üretir.
 *  partials : [{ freq, gain }]  — kısmi tonlar (uyumsuz oranlar = metalik zil)
 *  tau      : üstel sönüm sabiti (küçük = kısa/kuru, büyük = uzun çınlayan)
 *  noise    : { amount, ms }    — atak gürültüsü (davulun "tok"u, marakasın hışırtısı)
 *  ms       : toplam süre
 */
function hit({ partials, tau, ms, noise = null, peak = 0.5 }) {
  const n = secs(ms);
  const out = new Float64Array(n);
  const rnd = makeNoise();
  const attack = secs(6);
  const noiseN = noise ? secs(noise.ms) : 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = (i < attack ? i / attack : 1) * Math.exp(-t / tau);
    let s = 0;
    for (const p of partials) s += (p.gain ?? 1) * Math.sin(2 * Math.PI * p.freq * t);
    if (noise && i < noiseN) s += noise.amount * rnd() * (1 - i / noiseN);
    out[i] = s * env;
  }
  let max = 1e-9;
  for (const v of out) max = Math.max(max, Math.abs(v));
  const g = peak / max;
  return Array.from(out, (v) => v * g);
}

/** Ardışık notaları verilen tempoda birleştirir (ezgi motifi). */
function melody(freqs, { noteMs, gapMs = 0, tau = 0.28, peak = 0.42, harmonic = 0.25 }) {
  const stepN = secs(noteMs + gapMs);
  const out = new Float64Array(stepN * freqs.length + secs(120));
  freqs.forEach((f, idx) => {
    const noteN = secs(noteMs);
    const attack = secs(8);
    const off = idx * stepN;
    for (let i = 0; i < noteN; i++) {
      const t = i / SR;
      const env = (i < attack ? i / attack : 1) * Math.exp(-t / tau);
      const s = Math.sin(2 * Math.PI * f * t) + harmonic * Math.sin(4 * Math.PI * f * t);
      out[off + i] += s * env;
    }
  });
  let max = 1e-9;
  for (const v of out) max = Math.max(max, Math.abs(v));
  const g = peak / max;
  return Array.from(out, (v) => v * g);
}

const write = (name, samples) => {
  writeFileSync(join(OUT_DIR, name + '.wav'), buildWav(samples));
  console.log('  ✓ ' + name + '.wav');
};

mkdirSync(OUT_DIR, { recursive: true });

// ---- 1) Çalgı tınıları — "Hangi Çalgı Çaldı?" ----
// Onay cümleleri sesin fiziksel özelliğini adlandırdığı için tınılar o özelliği GERÇEKTEN taşımalı:
console.log('Çalgı tınıları:');
// Davul: kalın + derin + kısa (büyük, içi boş) — alt ton + kısa gürültü atağı
const davul = { partials: [{ freq: 90, gain: 1 }, { freq: 55, gain: 0.7 }], tau: 0.09, ms: 420, noise: { amount: 0.5, ms: 20 } };
write('davul', hit({ ...davul, peak: 0.5 }));
write('davul-kuvvetli', hit({ ...davul, peak: 0.5 }));
write('davul-hafif', hit({ ...davul, peak: 0.19 }));
// Zil: ince + uzun çınlayan (metal) — uyumsuz kısmi tonlar, büyük tau
write('zil', hit({ partials: [{ freq: 1200, gain: 1 }, { freq: 2400, gain: 0.6 }, { freq: 3140, gain: 0.4 }], tau: 0.55, ms: 1400, peak: 0.4 }));
// Marakas: hışırtı (taneler) — üç kısa gürültü patlaması
{
  const rnd = makeNoise();
  const total = secs(520);
  const out = new Float64Array(total);
  [0, 130, 260].forEach((startMs) => {
    const off = secs(startMs), len = secs(60);
    for (let i = 0; i < len; i++) {
      const env = Math.exp(-(i / SR) / 0.018);
      out[off + i] += rnd() * env;
    }
  });
  let max = 1e-9; for (const v of out) max = Math.max(max, Math.abs(v));
  write('marakas', Array.from(out, (v) => (v * 0.38) / max));
}
// Tahta blok: net + çok kısa (kuru)
write('tahta', hit({ partials: [{ freq: 800, gain: 1 }, { freq: 1600, gain: 0.5 }], tau: 0.02, ms: 200, peak: 0.42 }));

// ---- 2) Tempo / sayaç — "Davul Ustası" + "Hayvan Jimnastiği" ----
console.log('Tempo ve sayaç:');
write('metronom', hit({ partials: [{ freq: 1000, gain: 1 }], tau: 0.01, ms: 120, peak: 0.3 }));
write('tik', hit({ partials: [{ freq: 880, gain: 1 }], tau: 0.03, ms: 160, peak: 0.32 }));
write('tik-hizli', hit({ partials: [{ freq: 1046, gain: 1 }], tau: 0.02, ms: 120, peak: 0.32 }));
write('bitti', melody([659.25, 880.0], { noteMs: 180, gapMs: 20, tau: 0.16, peak: 0.42 }));

// ---- 3) Ezgi motifleri — "Ses Nasıl?" (aynı motif, tek özellik değişir) ----
console.log('Ezgi motifleri:');
const DO_SOL_5 = [523.25, 587.33, 659.25, 698.46, 783.99]; // do-re-mi-fa-sol (5. oktav)
// Tempo: 60 BPM (600 ms/nota) vs 160 BPM (225 ms/nota)
write('motif-yavas', melody(DO_SOL_5, { noteMs: 600, tau: 0.32 }));
write('motif-hizli', melody(DO_SOL_5, { noteMs: 225, tau: 0.16 }));
// Gürlük: aynı motif, tepe genlik farkı
write('motif-yuksek', melody(DO_SOL_5, { noteMs: 350, tau: 0.22, peak: 0.5 }));
write('motif-kisik', melody(DO_SOL_5, { noteMs: 350, tau: 0.22, peak: 0.1 }));
// Ses kalınlığı: iki oktav aşağı (kalın) vs iki oktav yukarı (ince)
write('motif-kalin', melody(DO_SOL_5.map((f) => f / 4), { noteMs: 350, tau: 0.34, harmonic: 0.3 }));
write('motif-ince', melody(DO_SOL_5.map((f) => f * 2), { noteMs: 350, tau: 0.18, harmonic: 0.18 }));
// Ezgi yönü: çıkan vs inen
write('motif-cikan', melody([523.25, 587.33, 659.25, 698.46, 783.99], { noteMs: 300, tau: 0.22 }));
write('motif-inen', melody([783.99, 698.46, 659.25, 587.33, 523.25], { noteMs: 300, tau: 0.22 }));

console.log('\n✅ Müzik SFX üretildi → assets/sounds/sfx/');
console.log('   Sonraki adım: lib/assetMap.ts içine require girdilerini ekle.');
