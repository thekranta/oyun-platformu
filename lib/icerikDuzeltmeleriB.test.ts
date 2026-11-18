import * as fs from 'fs';
import * as path from 'path';
import { buildNumberOptions } from './answerOptions';

// Bileşen dosyasından yalnız SAF palet işlevleri içe alınır; ses katmanı (expo-av/expo-asset) bu testte gerekmez.
jest.mock('../services/speechService', () => ({ speak: jest.fn(), stopSpeech: jest.fn(), speakThenWait: jest.fn() }));
jest.mock('../components/CountdownOverlay', () => ({ __esModule: true, default: () => null }));
import { buildPalette, colorDistance, EXTRA_COLORS, MIN_EXTRA_DISTANCE, STRIPE_FLAGS } from '../components/BayrakBoya';

/**
 * Denetim 2026-11-18, içerik hataları 2:
 *  1) Bayrak Boya: palete katılan ek renk bayrağın kendi renginin neredeyse aynısı olabiliyordu (#009246 / İtalya #008C45,
 *     #EF4135 / Avusturya #ED2939). Başarı koşulu birebir hex eşitliği olduğundan doğru rengi seçen çocuk bayrağı bitiremiyor,
 *     üstüne hata yazılıyordu (ajan benzetimi: turların ~%30'u, Ukrayna/İspanya/Litvanya ~%65).
 *  2) Kaç Oldu / Akıllı Çiftlik Sayma / Çiftlikte Sayalım: seçenekler küçükten büyüğe sıralandığı için doğru cevap çoğunlukla
 *     ORTADAKİ düğmeydi (Kaç Kaldı #49/#53 hatasının aynısı) → lib/answerOptions.ts buildNumberOptions.
 */
// Çalışma ağacında bazı dosyalar CRLF olabilir; kaynak-metin korumaları satır sonundan etkilenmesin.
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// Deterministik sözde-rastgele (mulberry32): istatistik testi kararsız olmasın.
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Renk uzaklığı fonksiyonunu kendi kendine doğrulamak yerine bağımsız, basit bir ölçü: RGB öklid.
const rgbDistance = (a: string, b: string) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
};

describe('Bayrak Boya: palet ek renkleri bayrak renklerinden uzak', () => {
  it('tüm çizgili bayraklar taranır (şerit tipi bayrak sayısı sabit kalmadan boşalmaz)', () => {
    expect(STRIPE_FLAGS.length).toBeGreaterThanOrEqual(19);
    STRIPE_FLAGS.forEach((f) => expect(['v', 'h']).toContain(f.render));
  });

  it('REGRESYON: İtalya paletinde #009246, Avusturya/Belçika paletinde #EF4135 asla yok; beyaz ile kirli beyaz birlikte çıkmaz', () => {
    const byId = (id: string) => STRIPE_FLAGS.find((f) => f.id === id)!;
    for (let s = 1; s <= 500; s++) {
      const rng = seeded(s);
      expect(buildPalette(byId('it').colors, rng)).not.toContain('#009246');
      expect(buildPalette(byId('it').colors, rng)).not.toContain('#ffffff');
      expect(buildPalette(byId('at').colors, rng)).not.toContain('#EF4135');
      expect(buildPalette(byId('be').colors, rng)).not.toContain('#EF4135');
      expect(buildPalette(byId('ua').colors, rng)).not.toContain('#0055A4');
      expect(buildPalette(byId('ua').colors, rng)).not.toContain('#FCD116');
      expect(buildPalette(byId('es').colors, rng)).not.toContain('#FCD116');
      expect(buildPalette(byId('lt').colors, rng)).not.toContain('#FCD116');
    }
  });

  it('her bayrak için 1200 rastgele palet: ek renkler bayrak renklerine eşikten yakın değil, palet boyutu ve içeriği doğru', () => {
    // Milyonlarca küçük expect yerine ihlaller toplanır ve sonunda tek expect ile raporlanır (hız + okunur hata mesajı).
    const violations: string[] = [];
    for (const flag of STRIPE_FLAGS) {
      const uniq = Array.from(new Set(flag.colors));
      const need = Math.max(1, 5 - uniq.length);
      for (let i = 0; i < 1200; i++) {
        // Yarısı sabit tohumlu, yarısı gerçek Math.random (bileşenin kullandığı yol).
        const palette = i % 2 === 0 ? buildPalette(flag.colors, seeded(i + 1)) : buildPalette(flag.colors);
        const tag = `${flag.id} [${palette.join(',')}]`;

        // Bayrağın kendi renkleri hep var; hiçbir renk iki kez yok (aynı React anahtarı olmaz).
        if (!uniq.every((c) => palette.includes(c))) violations.push(`${tag}: bayrak rengi eksik`);
        if (new Set(palette.map((c) => c.toLowerCase())).size !== palette.length) violations.push(`${tag}: tekrar eden renk`);
        if (palette.length !== uniq.length + need || palette.length < 5) violations.push(`${tag}: palet boyutu`);

        const extras = palette.filter((c) => !uniq.includes(c));
        if (extras.length !== need) violations.push(`${tag}: ek renk sayısı`);
        extras.forEach((e) => {
          if (!EXTRA_COLORS.includes(e)) violations.push(`${tag}: havuz dışı ek renk ${e}`);
          uniq.forEach((c) => {
            // Birincil ölçü (algısal) ve bağımsız RGB ölçüsü birlikte.
            if (colorDistance(e, c) < MIN_EXTRA_DISTANCE) violations.push(`${tag}: ${e} ~ ${c} (ΔE)`);
            if (rgbDistance(e, c) < 60) violations.push(`${tag}: ${e} ~ ${c} (RGB)`);
          });
        });
      }
    }
    expect(violations.slice(0, 10)).toEqual([]);
  });

  it('ek renk havuzu her bayrakta ihtiyaçtan fazla uzak renk içerir (yeni bayrak eklenirse bu test uyarır: EXTRA_COLORS genişlet)', () => {
    for (const flag of STRIPE_FLAGS) {
      const uniq = Array.from(new Set(flag.colors));
      const far = EXTRA_COLORS.filter((e) => uniq.every((c) => colorDistance(e, c) >= MIN_EXTRA_DISTANCE));
      expect(far.length).toBeGreaterThanOrEqual(Math.max(1, 5 - uniq.length));
    }
  });

  it('bayrağın kendi renkleri birbirinden ayırt edilir (birebir eşitlikle boyama adil kalsın)', () => {
    for (const flag of STRIPE_FLAGS) {
      const uniq = Array.from(new Set(flag.colors));
      for (let i = 0; i < uniq.length; i++) {
        for (let j = i + 1; j < uniq.length; j++) {
          expect(colorDistance(uniq[i], uniq[j])).toBeGreaterThanOrEqual(MIN_EXTRA_DISTANCE);
        }
      }
    }
  });

  it('colorDistance: aynı renk 0, siyah-beyaz çok uzak, yakın tonlar eşiğin altında', () => {
    expect(colorDistance('#ffffff', '#FFFFFF')).toBeCloseTo(0, 5);
    expect(colorDistance('#000000', '#ffffff')).toBeGreaterThan(90);
    expect(colorDistance('#009246', '#008C45')).toBeLessThan(MIN_EXTRA_DISTANCE);
    expect(colorDistance('#EF4135', '#ED2939')).toBeLessThan(MIN_EXTRA_DISTANCE);
    expect(colorDistance('#ffffff', '#F4F5F0')).toBeLessThan(MIN_EXTRA_DISTANCE);
    // 3 haneli hex de çözülür.
    expect(colorDistance('#fff', '#ffffff')).toBeCloseTo(0, 5);
  });

  it('havuz tükenirse (çok renkli bayrak) palet boyutu sabit kalır, en uzaktan doldurulur, tekrar yok, sonsuz döngü yok', () => {
    // Her ek rengin yakın bir kopyası bayrakta: hiçbir ek renk eşiği geçemez.
    const crowded = ['#010101', '#fefefe', '#0056A5', '#EE4034', '#FCD117', '#009347', '#7F57C3', '#FF9801'];
    const palette = buildPalette(crowded, seeded(7));
    crowded.forEach((c) => expect(palette).toContain(c));
    expect(palette).toHaveLength(crowded.length + 1);
    expect(new Set(palette.map((c) => c.toLowerCase())).size).toBe(palette.length);
  });

  it('bayrakta zaten bulunan ek renk (büyük/küçük harf farkıyla bile) ikinci kez eklenmez', () => {
    const palette = buildPalette(['#FFFFFF', '#000000'], seeded(3));
    expect(palette.filter((c) => c.toLowerCase() === '#ffffff')).toHaveLength(1);
    expect(palette.filter((c) => c.toLowerCase() === '#000000')).toHaveLength(1);
  });

  it('bileşen: palet ve ilk seçili renk TEK paletten gelir; ScrollIfNeeded sarmalayıcısı korunur', () => {
    const src = read('components/BayrakBoya.tsx');
    // Eskiden iki ayrı buildPalette çağrısı vardı: ilk seçili renk ekrandaki paletin dışında kalabiliyordu.
    expect(src).not.toContain('buildPalette(spec.colors)[0]');
    expect(src).toContain('useState<string>(initialPalette[0])');
    expect(src.match(/useState<string\[\]>\(\(\) => buildPalette\(spec\.colors\)\)/g)).toHaveLength(1);
    // Başarı koşulu hâlâ birebir eşitlik: yakın tonu doğru sayma yolu SEÇİLMEDİ (kırmızı/turuncu karışmasın).
    expect(src).toContain('next.every((c, idx) => c === spec.colors[idx])');
    expect(src).toContain('<ScrollIfNeeded contentStyle={styles.container}>');
  });
});

// ---------------------------------------------------------------------------------------------------------------------

/** Eski üretici (yalnız karşılaştırma için): cevaba yakın sayıları kümeye koyup KÜÇÜKTEN BÜYÜĞE sıralıyordu. */
const legacyOptions = (correct: number, cap: number): number[] => {
  const set = new Set<number>([correct]);
  let d = 1;
  while (set.size < 3) {
    if (correct - d >= 1) set.add(correct - d);
    if (set.size < 3 && correct + d <= cap) set.add(correct + d);
    d++;
    if (d > cap) break;
  }
  return Array.from(set).sort((a, b) => a - b);
};

describe('sayı seçenekleri: doğru cevap konumu rastgele, zorluk aynı', () => {
  // Her oyunun gerçekten yaptığı çağrı: [oyun, olası doğru cevaplar, aralık üstü]
  const games: { name: string; cases: { correct: number; cap: number }[] }[] = [
    // Kaç Oldu: toplamlar 2-5, aralık 1-5
    { name: 'KacOldu', cases: [2, 3, 4, 5].map((correct) => ({ correct, cap: 5 })) },
    // Akıllı Çiftlik Sayma: azami sayı zorluğa göre 3/4/5/7/9, hayvan sayısı 1..cap
    ...[3, 4, 5, 7, 9].map((cap) => ({
      name: `AkilliCiftlikSayma(cap=${cap})`,
      cases: Array.from({ length: cap }, (_, i) => ({ correct: i + 1, cap })),
    })),
    // Çiftlikte Sayalım: tur başına azami 3/4/5
    ...[3, 4, 5].map((cap) => ({
      name: `CiftlikteSayalim(cap=${cap})`,
      cases: Array.from({ length: cap }, (_, i) => ({ correct: i + 1, cap })),
    })),
  ];

  it.each(games.map((g) => [g.name, g] as const))('%s: aynı üç sayı (eski küme), 0 ve aralık dışı yok, tekrar yok', (_n, g) => {
    const rng = seeded(11);
    for (const { correct, cap } of g.cases) {
      for (let i = 0; i < 100; i++) {
        const o = buildNumberOptions(correct, { min: 1, max: cap }, rng);
        expect(o).toHaveLength(3);
        expect(new Set(o).size).toBe(3);
        expect(o).toContain(correct);
        expect([...o].sort((a, b) => a - b)).toEqual(legacyOptions(correct, cap));
      }
    }
  });

  it.each(games.map((g) => [g.name, g] as const))('%s: doğru cevap her konuma düşer, ortadaki düğme ezberlenemez', (_n, g) => {
    const rng = seeded(12);
    const N = 3000;
    for (const { correct, cap } of g.cases) {
      const pos = [0, 0, 0];
      for (let i = 0; i < N; i++) pos[buildNumberOptions(correct, { min: 1, max: cap }, rng).indexOf(correct)]++;
      pos.forEach((c) => {
        expect(c / N).toBeGreaterThan(0.28);
        expect(c / N).toBeLessThan(0.39);
      });
    }
    // Eski yöntem: sıralı → doğru cevap bazı durumlarda HEP ortadaydı (kanıt: testin yakaladığı hatanın kendisi).
    const legacyAlwaysMiddle = g.cases.some(({ correct, cap }) => legacyOptions(correct, cap).indexOf(correct) === 1);
    expect(legacyAlwaysMiddle).toBe(true);
  });

  it('Kaç Oldu: 8 turluk bir oyunda doğru cevap tüm turlarda ortada kalmaz (tur başına ortada olasılığı ~1/3)', () => {
    // Eski yöntemle toplam 3 ve 4 turlarında doğru cevap hep ortadaydı (8 turun 4'ünde kesin ortada).
    const rng = seeded(13);
    let middleRounds = 0;
    const trials = 2000;
    for (let t = 0; t < trials; t++) {
      for (const total of [2, 2, 3, 3, 4, 4, 5, 5]) {
        if (buildNumberOptions(total, { min: 1, max: 5 }, rng).indexOf(total) === 1) middleRounds++;
      }
    }
    const share = middleRounds / (trials * 8);
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThan(0.37);
    // Eskiden: totals 2 → [1,2,3] ortada, 3 → [2,3,4] ortada, 4 → [3,4,5] ortada, 5 → [3,4,5] sonda = 6/8.
    const legacyMiddle = [2, 2, 3, 3, 4, 4, 5, 5].filter((c) => legacyOptions(c, 5).indexOf(c) === 1).length;
    expect(legacyMiddle).toBe(6);
  });

  describe('bileşenler buildNumberOptions kullanır, seçenekler tur başında bir kez üretilir', () => {
    const cases: [string, RegExp][] = [
      ['KacOldu', /setOptions\(buildNumberOptions\(r\.total, \{ min: 1, max: 5 \}\)\);/],
      ['AkilliCiftlikSayma', /options: buildNumberOptions\(count, \{ min: 1, max: cap \}\)/],
      ['CiftlikteSayalim', /setOptions\(buildNumberOptions\(c, \{ min: 1, max: cap \}\)\);/],
    ];
    it.each(cases)('%s', (name, call) => {
      const src = read(`components/${name}.tsx`);
      expect(src).toContain("import { buildNumberOptions } from '../lib/answerOptions';");
      expect(src).toMatch(call);
      // Eski sıralı üretici gitti.
      expect(src).not.toMatch(/Array\.from\(set\)\.sort/);
      expect(src).not.toMatch(/const buildOptions = /);
      // Tek çağrı: render sırasında yeniden üretilmez (düğmeler yer değiştirmesin).
      expect(src.match(/buildNumberOptions\(/g)).toHaveLength(1);
      const renderStart = src.indexOf('return (\n    <View style={styles.container}>');
      expect(renderStart).toBeGreaterThan(0);
      expect(src.indexOf('buildNumberOptions(')).toBeLessThan(renderStart);
    });

    it('Konuşulan cümleler ve tur sayıları aynı kaldı', () => {
      const kac = read('components/KacOldu.tsx');
      expect(kac).toContain("speak('Hepsi kaç etti? Say bakalım!', { instructions: HAPPY_VOICE });");
      expect(kac).toContain('speakThenWait(`${total} oldu! Aferin.`, 1300');
      expect(kac).toContain('const TOTAL_ROUNDS = KAC_OLDU_ROUNDS;');

      const akilli = read('components/AkilliCiftlikSayma.tsx');
      expect(akilli).toContain("speak('Kaç tane var? Say bakalım!', { instructions: HAPPY_VOICE });");
      expect(akilli).toContain('speakThenWait(`${current.count} tane! Aferin.`, 1300');
      expect(akilli).toContain('const TOTAL_ROUNDS = 9;');
      // Zorluk eğrisi: aralık tablosu ve checkpoint ayarı değişmedi.
      expect(akilli).toContain('1: 3, 2: 4, 3: 5, 4: 7, 5: 9,');
      expect(akilli).toContain('checkpointEvery: 3, startDifficulty: START_DIFF');

      const ciftlik = read('components/CiftlikteSayalim.tsx');
      expect(ciftlik).toContain("speak('Kaç tane var? Say bakalım!', { instructions: HAPPY_VOICE });");
      expect(ciftlik).toContain('speakThenWait(`${count} tane! Aferin.`, 1300');
      expect(ciftlik).toContain('const TOTAL_ROUNDS = 8;');
      expect(ciftlik).toContain('const maxCount = (round: number) => (round <= 3 ? 3 : round <= 6 ? 4 : 5);');
    });
  });
});
