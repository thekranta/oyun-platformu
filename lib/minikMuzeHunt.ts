// Minik Müze "Detay Avı": çocuk tabloda yönergede söylenen ayrıntıyı bulup dokunur.
// Hedefler görsele göre NORMALİZE edilmiş dairelerle (spot) tanımlanır; aynı hedefin birden çok yeri olabilir
// (ör. "bir yıldız bul": tablodaki herhangi bir yıldız doğru sayılır).

/** x, y: 0..1 (görselin sol-üstüne göre); r: görselin GENİŞLİĞİNE oranla yarıçap. */
export interface HuntSpot { x: number; y: number; r: number }

export interface HuntTarget {
    id: string;
    /** Çocuğa okunan yönerge (VoiceBox klibi var). */
    prompt: string;
    /** Bulununca okunan kısa bilgi (VoiceBox klibi var). */
    found: string;
    spots: HuntSpot[];
}

/** Parmak payı: gerçek yarıçap bununla çarpılır ve en az MIN_TAP_RADIUS_PX olur (küçük ekranda da dokunulabilsin). */
export const HUNT_SLACK = 1.3;
export const MIN_TAP_RADIUS_PX = 26;

/** (px, py) dokunuşu (görsel kutusuna göre piksel) hedefin herhangi bir yerine denk geliyor mu? */
export function hitTest(target: Pick<HuntTarget, 'spots'>, px: number, py: number, w: number, h: number): boolean {
    if (!(w > 0) || !(h > 0)) return false;
    return target.spots.some((s) => {
        const radius = Math.max(s.r * w * HUNT_SLACK, MIN_TAP_RADIUS_PX);
        const dx = px - s.x * w;
        const dy = py - s.y * h;
        return dx * dx + dy * dy <= radius * radius;
    });
}

/** İpucu halkası için dokunuşa EN YAKIN alan (dokunuş yoksa ilki). */
export function nearestSpot(target: Pick<HuntTarget, 'spots'>, px: number, py: number, w: number, h: number): HuntSpot {
    let best = target.spots[0];
    let bestD = Infinity;
    for (const s of target.spots) {
        const dx = px - s.x * w;
        const dy = py - s.y * h;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = s; }
    }
    return best;
}

/** Yanlış dokunuş sayısına göre ipucu düzeyi: 0 = yok, 1 = sözlü ipucu, 2 = parlayan halka. */
export function hintLevel(wrongCount: number): 0 | 1 | 2 {
    if (wrongCount >= 2) return 2;
    if (wrongCount >= 1) return 1;
    return 0;
}

/** Bir sonraki hedefin sırası; son hedefse null (av bitti). */
export function nextTargetIndex(current: number, total: number): number | null {
    return current + 1 < total ? current + 1 : null;
}
