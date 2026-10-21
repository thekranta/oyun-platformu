/**
 * Sayı seçenekleri üreticisi: doğru cevap + yakın çeldiriciler, KARIŞIK sırada.
 *
 * Eski yöntem (cevap±1'i bir kümeye koyup küçükten büyüğe SIRALAMAK) doğru cevabı çoğu
 * turda ORTADAKİ tuşa yerleştiriyordu (Kaç Kaldı'da 8 turun 7'sinde): çocuk saymadan
 * ortaya basıp geçebiliyordu (Oyun_Test_Listesi #49/#53). Çeldiriciler yine cevaba en
 * YAKIN sayılardır (zorluk değişmez); yalnızca dizilişi rastgeledir.
 */
export interface OptionRange {
  min: number;
  max: number;
  /** Toplam seçenek sayısı (doğru cevap dahil). Varsayılan 3. */
  count?: number;
}

export function buildNumberOptions(
  correct: number,
  { min, max, count = 3 }: OptionRange,
  rng: () => number = Math.random,
): number[] {
  const candidates: { n: number; key: number }[] = [];
  for (let n = min; n <= max; n++) {
    // Yakın olan önce; eşit uzaklıkta olanlar arasında rastgele (0.9 < 1 → farklı uzaklıklar karışmaz).
    if (n !== correct) candidates.push({ n, key: Math.abs(n - correct) + rng() * 0.9 });
  }
  candidates.sort((a, b) => a.key - b.key);

  const options = [correct, ...candidates.slice(0, Math.max(0, count - 1)).map((c) => c.n)];

  // Fisher–Yates: doğru cevabın yeri her konumda eşit olasılıklı.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
