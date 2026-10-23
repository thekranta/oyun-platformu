// Şekil Treni vagon yerleşimi: tüm seçenekler (2, 3 ya da 4) TEK sırada durur; vagon boyutu ekran genişliğine göre ayarlanır.
export const WAGON_MAX = 92;
export const WAGON_MIN = 64;
export const LOCO_W = 56;
export const TRAIN_MAX_W = 480;      // train: maxWidth
export const TRAIN_PAD_H = 10;       // train: paddingHorizontal

export const wagonGap = (n: number) => (n === 4 ? 6 : 10);

export function trainLayout(winW: number, n: number) {
  const rowW = Math.min(winW, TRAIN_MAX_W) - 2 * TRAIN_PAD_H;
  // Lokomotif kararı en kalabalık (4 seçenek) durumdan verilir; oyun boyunca aynı kalır.
  const showLoco = Math.floor((rowW - LOCO_W - 4 * wagonGap(4)) / 4) >= WAGON_MIN;
  const free = rowW - (showLoco ? LOCO_W + wagonGap(n) : 0) - (n - 1) * wagonGap(n);
  return { showLoco, gap: wagonGap(n), wagon: Math.min(WAGON_MAX, Math.floor(free / n)) };
}
