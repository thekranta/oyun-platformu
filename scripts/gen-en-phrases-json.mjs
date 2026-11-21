/**
 * gen-en-phrases-json.mjs — İngilizce ek etkinlik oyunlarının klip listelerini web ön-yükleme tablosuna (gen-tts-manifest.mjs) tanıtır.
 * Yazar: scripts/tts-phrases-english.json (İngilizce klipler, oyun etiketli) ve scripts/tts-phrases-intro-english.json (Türkçe giriş yönergeleri).
 * Kaynak: constants/ingilizceKelimeler.ts (+ her oyunun lib/en*.ts dosyasındaki TR_YONERGELER). Sırası:
 *   node scripts/gen-en-phrases-json.mjs && node scripts/gen-tts-assets.mjs && node scripts/gen-tts-manifest.mjs
 * NOT: gen-voices.mjs bu iki dosyayı OKUMAZ (Türkçe girişleri `--text` ile üretin); yalnız ön-yükleme tablosunu besler.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    EN_ALKISLAR, EN_BOYA_NESNELERI, EN_EYLEMLER, EN_HAYVANLAR, EN_MEYVELER, EN_RENKLER, EN_SAYALIM_SORU, EN_SAYILAR, EN_SELAM,
    boyaGorevi, enSlug, eylemSoyle, ogretmenDerKi,
} from '../constants/ingilizceKelimeler.ts';
const __dirname = dirname(fileURLToPath(import.meta.url));

// lib/en*.ts dosyaları uzantısız içe aktarım kullanır (Node doğrudan yükleyemez): giriş yönergesi (tek tırnaklı sabit) kaynaktan okunur.
// (Sabitin gerçekten oyunda kullanıldığını ve klibinin olduğunu lib/ingilizceKlipleri.test.ts doğrular.)
function giris(dosya) {
    const src = readFileSync(join(__dirname, '..', dosya), 'utf8');
    const m = src.match(/GIRIS_MESAJI\s*=\s*'((?:[^'\\]|\\.)*)'/);
    if (!m) throw new Error('GIRIS_MESAJI bulunamadı: ' + dosya);
    return [m[1].replace(/\\'/g, "'")];
}
const TR_BOYA = giris('lib/enBoya.ts');
const TR_DINLE = giris('lib/enDinleDokun.ts');
const TR_CIFT = giris('components/EnglishKonusanCiftler.tsx');
const TR_OGRETMEN = giris('lib/enOgretmenDerKi.ts');
const TR_SAYALIM = giris('lib/enSayalim.ts');
const en = [];
const add = (game, texts) => { for (const text of texts) en.push({ text, slug: enSlug(text), game }); };

add('en-dinle-dokun', [...EN_RENKLER, ...EN_HAYVANLAR, ...EN_MEYVELER].map((k) => k.en).concat(EN_ALKISLAR));
add('en-konusan-ciftler', [...EN_HAYVANLAR.map((k) => k.en), 'Good job!']);
add('en-boya', [
    ...EN_BOYA_NESNELERI.flatMap((n) => n.renkler.map((rid) => boyaGorevi(n, EN_RENKLER.find((r) => r.id === rid)))),
    ...EN_RENKLER.map((r) => r.en), ...EN_ALKISLAR,
]);
add('en-ogretmen-der-ki', [...EN_EYLEMLER.map(ogretmenDerKi), ...EN_EYLEMLER.map(eylemSoyle), ...EN_ALKISLAR]);
add('en-sayalim', [...EN_SAYILAR.map((k) => k.en), EN_SAYALIM_SORU, ...EN_ALKISLAR]);
void EN_SELAM;

const tr = [];
for (const [game, list] of [['en-dinle-dokun', TR_DINLE], ['en-konusan-ciftler', TR_CIFT], ['en-boya', TR_BOYA], ['en-ogretmen-der-ki', TR_OGRETMEN], ['en-sayalim', TR_SAYALIM]]) {
    for (const text of list) tr.push({ text, game });
}

writeFileSync(join(__dirname, 'tts-phrases-english.json'), JSON.stringify(en, null, 1) + '\n');
writeFileSync(join(__dirname, 'tts-phrases-intro-english.json'), JSON.stringify(tr, null, 1) + '\n');
console.log(`İngilizce ${en.length} kayıt, Türkçe giriş ${tr.length} kayıt yazıldı.`);
