// Google Play mağaza görselleri: 512 ikon + 1024x500 öne çıkan görsel.
// Çalıştır: node scripts/make-play-graphics.mjs  → store/play/
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = 'store/play';
fs.mkdirSync(OUT, { recursive: true });

// 1) Uygulama ikonu 512x512 (Play: 32 bit PNG, en çok 1 MB)
await sharp('assets/images/icon.png').resize(512, 512).png().toFile(`${OUT}/icon-512.png`);

// 2) Öne çıkan görsel 1024x500
const W = 1024;
const H = 500;
const mascot = await sharp('assets/branding/mascot/kutluyor.webp')
  .resize(430, 430)
  .png()
  .toBuffer();

const bg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5DDCC8"/>
      <stop offset="1" stop-color="#2A9D8F"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <circle cx="860" cy="250" r="230" fill="#FFFFFF" fill-opacity="0.18"/>
  <circle cx="120" cy="470" r="150" fill="#FFFFFF" fill-opacity="0.10"/>
  <text x="64" y="215" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="104" fill="#FFFFFF">Bilimo</text>
  <text x="68" y="285" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="38" fill="#FAF2E4">3–6 yaş için oyunla öğrenme</text>
  <text x="68" y="336" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#FAF2E4" fill-opacity="0.95">Sayılar, harfler, renkler, müzik ve daha fazlası</text>
</svg>`;

await sharp(Buffer.from(bg))
  .composite([{ input: mascot, left: 640, top: 40 }])
  .png()
  .toFile(`${OUT}/feature-graphic-1024x500.png`);

console.log('tamam', fs.readdirSync(OUT));
