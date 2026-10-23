import { LOCO_W, TRAIN_MAX_W, TRAIN_PAD_H, WAGON_MAX, WAGON_MIN, trainLayout } from './sekilTreniLayout';

const GENISLIKLER = [320, 360, 375, 390, 412, 480, 768, 1280];

describe('Şekil Treni yerleşimi', () => {
  it.each(GENISLIKLER)('%i px: 2, 3 ve 4 seçenek tek satıra sığar', (w) => {
    const rowW = Math.min(w, TRAIN_MAX_W) - 2 * TRAIN_PAD_H;
    for (const n of [2, 3, 4]) {
      const { showLoco, gap, wagon } = trainLayout(w, n);
      const toplam = (showLoco ? LOCO_W + gap : 0) + n * wagon + (n - 1) * gap;
      expect(toplam).toBeLessThanOrEqual(rowW);
    }
  });

  it.each(GENISLIKLER)('%i px: vagon çocuk parmağı için yeterince büyük (en az 64 px, en çok 92 px)', (w) => {
    for (const n of [2, 3, 4]) {
      const { wagon } = trainLayout(w, n);
      expect(wagon).toBeGreaterThanOrEqual(WAGON_MIN);
      expect(wagon).toBeLessThanOrEqual(WAGON_MAX);
    }
  });

  it('dört seçenekte vagon boyutu: 360 px -> 65, 375 px -> 68, 390 px -> 72, 412 px -> 78, 480 px ve üstü -> 92', () => {
    expect(trainLayout(360, 4).wagon).toBe(65);
    expect(trainLayout(375, 4).wagon).toBe(68);
    expect(trainLayout(390, 4).wagon).toBe(72);
    expect(trainLayout(412, 4).wagon).toBe(78);
    expect(trainLayout(480, 4).wagon).toBe(92);
    expect(trainLayout(1280, 4).wagon).toBe(92);
  });

  it('çok dar ekranda (320 px) lokomotif gizlenir, vagonlar küçülmez; geniş ekranda lokomotif görünür', () => {
    expect(trainLayout(320, 4).showLoco).toBe(false);
    expect(trainLayout(320, 4).wagon).toBeGreaterThanOrEqual(70);
    expect(trainLayout(360, 4).showLoco).toBe(true);
    expect(trainLayout(768, 4).showLoco).toBe(true);
  });

  it('lokomotif kararı turdan bağımsızdır (oyun boyunca aynı kalır)', () => {
    for (const w of GENISLIKLER) {
      const s = [2, 3, 4].map((n) => trainLayout(w, n).showLoco);
      expect(new Set(s).size).toBe(1);
    }
  });

  it('iki seçenekte vagon her genişlikte tam boyda (92 px)', () => {
    for (const w of GENISLIKLER) expect(trainLayout(w, 2).wagon).toBe(92);
  });
});
