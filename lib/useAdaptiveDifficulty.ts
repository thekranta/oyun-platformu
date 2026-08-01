/**
 * useAdaptiveDifficulty — Uyarlanabilir (dinamik) zorluk motoru
 * ------------------------------------------------------------
 * Oyunlar her seviye sonunda `recordLevel(...)` çağırır. Motor, her
 * `checkpointEvery` seviyede bir çocuğun son performansını (doğruluk + hız)
 * değerlendirir ve SONRAKİ seviyelerin zorluğunu artırır/azaltır/korur.
 *
 * Örnek: 10 seviyelik oyun, checkpointEvery=3 → 3. seviye bitince değerlendirir,
 * 4. seviyenin zorluğunu belirler; 6. ve 9. seviyelerde tekrar ayarlar.
 *
 * Oyun, dönen `difficulty` değerini kullanarak seviye içeriğini üretir
 * (sayı aralığı, yakınlık, nesne/çeldirici sayısı, süre baskısı vb.).
 *
 * Saf (React'sız) `performanceScore` ve `adjustDifficulty` fonksiyonları da
 * dışa aktarılır; test/simülasyon için kullanılabilir.
 */

import { useCallback, useRef, useState } from 'react';

export interface LevelOutcome {
    correct: number;    // doğru sayısı (basit oyunda geçtiyse 1)
    total: number;      // toplam soru (basit oyunda 1)
    errors: number;     // hata sayısı
    timeMs: number;     // seviyede geçen süre (ms)
    targetMs?: number;  // beklenen süre (hız değerlendirmesi için, opsiyonel)
}

export interface AdaptiveOptions {
    minDifficulty?: number;   // varsayılan 1
    maxDifficulty?: number;   // varsayılan 5
    startDifficulty?: number; // varsayılan minDifficulty
    checkpointEvery?: number; // varsayılan 3
    raiseThreshold?: number;  // varsayılan 0.80 (bu skorun üstünde zorluk +1)
    lowerThreshold?: number;  // varsayılan 0.45 (bu skorun altında zorluk -1)
    accuracyWeight?: number;  // varsayılan 0.7 (skorda doğruluk ağırlığı)
}

export interface AdaptiveApi {
    difficulty: number;                        // sıradaki seviyenin zorluğu
    level: number;                             // tamamlanan seviye sayısı
    trajectory: number[];                      // her seviyenin oynandığı zorluk
    lastScore: number | null;                  // son checkpoint skoru (0..1)
    recordLevel: (outcome: LevelOutcome) => number; // sonuç; sıradaki difficulty döner
    reset: () => void;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Bir seviye grubunun performans skoru (0..1). Doğruluk + hızın ağırlıklı ortalaması. */
export function performanceScore(outcomes: LevelOutcome[], accuracyWeight = 0.7): number {
    if (!outcomes.length) return 0.5;

    let accSum = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (const o of outcomes) {
        const total = Math.max(1, o.total);
        // Doğruluk: hata oranını temel al (oyunlar arası en tutarlı sinyal)
        const acc = clamp01((total - o.errors) / total);
        accSum += acc;

        // Hız: hedef süre verildiyse değerlendir (hızlı = yüksek)
        if (o.targetMs && o.targetMs > 0 && o.timeMs > 0) {
            speedSum += clamp01(o.targetMs / o.timeMs);
            speedCount += 1;
        }
    }

    const accuracy = accSum / outcomes.length;
    if (speedCount === 0) return accuracy; // hız verisi yoksa yalnız doğruluk

    const speed = speedSum / speedCount;
    const w = clamp01(accuracyWeight);
    return clamp01(accuracy * w + speed * (1 - w));
}

/** Mevcut zorluk + skora göre yeni zorluğu belirle (saf). */
export function adjustDifficulty(
    current: number,
    score: number,
    opts: Required<Pick<AdaptiveOptions, 'minDifficulty' | 'maxDifficulty' | 'raiseThreshold' | 'lowerThreshold'>>,
): number {
    if (score >= opts.raiseThreshold) return Math.min(opts.maxDifficulty, current + 1);
    if (score <= opts.lowerThreshold) return Math.max(opts.minDifficulty, current - 1);
    return current;
}

export function useAdaptiveDifficulty(options: AdaptiveOptions = {}): AdaptiveApi {
    const minD = options.minDifficulty ?? 1;
    const maxD = options.maxDifficulty ?? 5;
    const checkpointEvery = Math.max(1, options.checkpointEvery ?? 3);
    const raiseThreshold = options.raiseThreshold ?? 0.8;
    const lowerThreshold = options.lowerThreshold ?? 0.45;
    const accuracyWeight = options.accuracyWeight ?? 0.7;
    const start = Math.max(minD, Math.min(maxD, options.startDifficulty ?? minD));

    // Oyunlar recordLevel'i çoğunlukla setTimeout içinden çağırır → stale closure'ı
    // önlemek için güncel değerleri ref'lerde tutuyoruz (kod tabanı deseni).
    const difficultyRef = useRef(start);
    const historyRef = useRef<LevelOutcome[]>([]);
    const trajectoryRef = useRef<number[]>([]);

    const [difficulty, setDifficulty] = useState(start);
    const [level, setLevel] = useState(0);
    const [trajectory, setTrajectory] = useState<number[]>([]);
    const [lastScore, setLastScore] = useState<number | null>(null);

    const recordLevel = useCallback((outcome: LevelOutcome): number => {
        historyRef.current.push(outcome);
        // Bu seviye, mevcut zorlukta oynandı → geçmişe onu yaz.
        trajectoryRef.current.push(difficultyRef.current);

        const count = historyRef.current.length;
        let next = difficultyRef.current;

        if (count % checkpointEvery === 0) {
            const recent = historyRef.current.slice(-checkpointEvery);
            const score = performanceScore(recent, accuracyWeight);
            setLastScore(score);
            next = adjustDifficulty(difficultyRef.current, score, {
                minDifficulty: minD,
                maxDifficulty: maxD,
                raiseThreshold,
                lowerThreshold,
            });
        }

        difficultyRef.current = next;
        setDifficulty(next);
        setLevel(count);
        setTrajectory([...trajectoryRef.current]);
        return next;
    }, [checkpointEvery, accuracyWeight, minD, maxD, raiseThreshold, lowerThreshold]);

    const reset = useCallback(() => {
        difficultyRef.current = start;
        historyRef.current = [];
        trajectoryRef.current = [];
        setDifficulty(start);
        setLevel(0);
        setTrajectory([]);
        setLastScore(null);
    }, [start]);

    return { difficulty, level, trajectory, lastScore, recordLevel, reset };
}
