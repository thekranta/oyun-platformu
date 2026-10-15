// Minik Müze "Tablo Yapbozu": tablo parçalara bölünür, çocuk parçaya dokunup yerine dokunarak yerleştirir.
// Saf mantık burada (ızgara, karıştırma, parça konumu, ipucu); arayüz components/minikMuze/TabloYapbozu.tsx.

export interface PuzzleGrid { cols: number; rows: number }

/** Zorluk basamakları: 0 = 4 parça, 1 = 9 parça (okul öncesi için küçükten büyüğe). */
export const PUZZLE_LEVELS: PuzzleGrid[] = [
    { cols: 2, rows: 2 },
    { cols: 3, rows: 3 },
];

export const gridForLevel = (level: number): PuzzleGrid => PUZZLE_LEVELS[Math.max(0, Math.min(level, PUZZLE_LEVELS.length - 1))];

export const hasNextLevel = (level: number): boolean => level < PUZZLE_LEVELS.length - 1;

export const pieceCount = (g: PuzzleGrid): number => g.cols * g.rows;

/** Parça kimliği = satır * cols + sütun; doğru yuva da aynı kimliktir. */
export const isCorrectSlot = (pieceId: number, slotId: number): boolean => pieceId === slotId;

/** Tohumlu, tekrarlanabilir karıştırma (test edilebilir). Parça sayısı > 1 ise sonuç ASLA sıralı (çözülmüş) olmaz. */
export function shuffleOrder(count: number, seed: number): number[] {
    const order = Array.from({ length: count }, (_, i) => i);
    if (count < 2) return order;
    let s = (Math.floor(Math.abs(seed)) % 2147483647) || 1;
    const rand = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
    for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    if (order.every((v, i) => v === i)) order.push(order.shift() as number);   // sıralı çıktıysa bir kaydır
    return order;
}

export interface PieceRect { left: number; top: number; w: number; h: number; row: number; col: number }

/** Parçanın (tablo kutusuna göre) konumu ve boyutu. Parçalar tabloyu boşluksuz kaplar. */
export function pieceRect(id: number, g: PuzzleGrid, boardW: number, boardH: number): PieceRect {
    const col = id % g.cols;
    const row = Math.floor(id / g.cols);
    const w = boardW / g.cols;
    const h = boardH / g.rows;
    return { left: col * w, top: row * h, w, h, row, col };
}

/** Seçili parça için art arda yanlış yer denemesi: 0-1 hata ipucu yok, 2+ doğru yuva parlar. */
export const SHOW_HINT_AFTER = 2;
export const showHint = (wrongCount: number): boolean => wrongCount >= SHOW_HINT_AFTER;

/** Tepsideki parçanın kenar uzunluğu hedefi (px): az parça büyük, çok parça küçük; dokunma alanı >= 44. */
export const trayPieceMax = (g: PuzzleGrid): number => (pieceCount(g) <= 4 ? 84 : 60);

/** Tepsi ölçeği: parçanın büyük kenarı hedefe sığsın, asla büyütme. */
export function trayScale(p: { w: number; h: number }, g: PuzzleGrid): number {
    const big = Math.max(p.w, p.h);
    if (big <= 0) return 1;
    return Math.min(1, trayPieceMax(g) / big);
}
