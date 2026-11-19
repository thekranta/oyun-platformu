/**
 * Web'de İyzico ile satılan veli paketlerinin SUNUCU tarafı fiyat/süre tablosu.
 *
 * NEDEN sunucuda: fiyat istemciden ASLA alınmaz; istemci yalnız paket adını gönderir, tutar buradan gelir.
 * Kaynak: PRICING.md ve MAGAZA_YAYIN_REHBERI.md §2.4 web sütunu (KDV dahil). Çınar ve kurum paketleri web'de
 * otomatik satılmaz (elle atanmaya devam eder), bu yüzden burada yoktur. Fiyat değişirse yalnız bu dosya değişir.
 * Tutarlar kuruş (tam sayı) tutulur: ondalık kayan nokta hatası (0.1 + 0.2) para hesabına sızmasın.
 */
export const WEB_PAKETLER = {
  tohum: { kurus: 39900, sureAy: 1, ad: 'Tohum' },
  filiz: { kurus: 99900, sureAy: 3, ad: 'Filiz' },
  fidan: { kurus: 174900, sureAy: 6, ad: 'Fidan' },
  orman: { kurus: 289900, sureAy: 12, ad: 'Orman' },
} as const;

export type WebPaketKodu = keyof typeof WEB_PAKETLER;

/** Gelen değer bilinen bir web paketi mi? (Object.prototype anahtarları -- "toString" gibi -- kabul edilmez.) */
export function isWebPaket(v: unknown): v is WebPaketKodu {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(WEB_PAKETLER, v);
}

/**
 * Kuruşu İyzico'nun beklediği fiyat dizesine çevirir: nokta ondalık ayırıcı, binlik ayırıcı yok,
 * sondaki sıfırlar atılır (39900 -> "399", 174950 -> "1749.5", 1999 -> "19.99").
 */
export function kurusToIyzicoPrice(kurus: number): string {
  if (!Number.isInteger(kurus) || kurus < 0) throw new Error('gecersiz_kurus');
  const lira = Math.floor(kurus / 100);
  const kalan = kurus % 100;
  if (kalan === 0) return String(lira);
  return `${lira}.${String(kalan).padStart(2, '0')}`.replace(/0+$/, '');
}

/**
 * İyzico'dan dönen fiyatı (ör. 399.00000000 sayı ya da "399.0" dize) kuruşa çevirir; çevrilemezse null.
 * NEDEN Math.round: 1749.5 * 100 gibi işlemlerde kayan nokta 174949.99999 verebilir.
 */
export function iyzicoPriceToKurus(v: unknown): number | null {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  if (typeof v === 'string' && !/^\d+(\.\d+)?$/.test(v.trim())) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
