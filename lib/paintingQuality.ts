/**
 * Minik Müze tablo görseli çözünürlüğü seçimi (saf, testli). Tam boy tablolar 1280-1920 px ve 0,3-1,7 MB'dır; anlatım
 * sırasında tablo 3 kata kadar yakınlaştığından büyük ekranda bu çözünürlük gerekir. Küçük ekranda (telefon, küçük
 * tablet) ve yavaş / veri tasarruflu bağlantıda ise 1280 px'lik sürüm (yaklaşık yarı boyut) kullanılır.
 */
export const SMALL_SCREEN_MAX_SIDE = 1200;

export interface ConnectionInfo {
    saveData?: boolean;
    effectiveType?: string;
}

const SLOW_TYPES = ['slow-2g', '2g', '3g'];

/** Küçük sürüm tercih edilsin mi: veri tasarrufu / yavaş bağlantı, ya da küçük ekran (uzun kenar ≤ 1200 CSS px). */
export function shouldUseSmallPaintings(width: number, height: number, connection?: ConnectionInfo | null): boolean {
    if (connection?.saveData) return true;
    if (connection?.effectiveType && SLOW_TYPES.includes(connection.effectiveType)) return true;
    return Math.max(width, height) <= SMALL_SCREEN_MAX_SIDE;
}

/** Tarayıcının ağ bilgisi (Network Information API); yoksa undefined. */
export function currentConnection(): ConnectionInfo | undefined {
    if (typeof navigator === 'undefined') return undefined;
    return (navigator as unknown as { connection?: ConnectionInfo }).connection;
}
