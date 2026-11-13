import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Ekrana sığdırma yardımcıları (dikey bütçe).
 *
 * SORUN: kaydırmasız oyun ekranları sabit boyutlu kartlarla yazılmıştı; kısa/dar Android telefonlarda (ve kenardan kenara
 * çizimde sistem çubukları düşünce) alttaki seçenekler ekrandan taşıyor, kaydırma olmadığı için çocuk oyuna devam edemiyordu
 * (Eksik Sayıyı Bul: 5 seçenekten 2'si görünmüyordu). Çözüm: boyutları GERÇEK kullanılabilir alandan türetmek.
 *   - `fitRow`: n öğeyi genişliğe göre tek satıra (sığmıyorsa dengeli 2-3 satıra) yerleştirir, dokunma boyutunu korur.
 *   - `useFitScale`: içerik, kapsayıcıdan yüksekse boşluk/yazı ölçeğini küçültür (ölçülür, tahmin edilmez; yazı tipi büyütme,
 *     sistem çubukları, ekran yoğunluğu gibi cihaz farkları kendiliğinden hesaba katılır).
 */

export const FIT_MIN_SCALE = 0.6;

/** İçerik (contentH) kapsayıcıdan (availableH) yüksekse bir sonraki, daha küçük ölçek; sığıyorsa aynı ölçek. */
export function nextFitScale(current: number, availableH: number, contentH: number, min: number = FIT_MIN_SCALE): number {
    if (!(availableH > 0) || !(contentH > 0)) return current;
    if (contentH <= availableH + 1) return current;
    const proportional = current * (availableH / contentH);
    return Math.max(min, Math.min(current - 0.02, proportional));
}

export interface RowFit {
    /** Her öğenin kenarı (dp). */
    size: number;
    /** Bir satırdaki öğe sayısı. */
    perRow: number;
    rows: number;
}

/**
 * `count` öğeyi `innerW` genişliğe yerleştirir. Önce tek satır denenir (öğe en az `oneRowMin`), olmazsa dengeli 2, 3… satır
 * (öğe en az `minSize`). Öğe boyutu `base`i aşmaz. Hiçbiri sığmazsa `minSize` ile elverdiği kadar satıra böler.
 */
export function fitRow(innerW: number, count: number, gap: number, base: number, minSize = 48, oneRowMin = 50): RowFit {
    const n = Math.max(1, Math.floor(count));
    const w = Math.max(0, innerW);
    for (let rows = 1; rows <= n; rows++) {
        const perRow = Math.ceil(n / rows);
        const size = Math.floor((w - gap * (perRow - 1)) / perRow);
        const need = rows === 1 ? oneRowMin : minSize;
        if (size >= need) return { size: Math.min(size, base), perRow, rows };
    }
    const perRow = Math.max(1, Math.floor((w + gap) / (minSize + gap)));
    return { size: minSize, perRow, rows: Math.ceil(n / perRow) };
}

/**
 * Kapsayıcıya (`onContainerLayout`, flex:1) ve içeriğe (`onContentLayout`, doğal yükseklikte, flex vermeden) bağlanır;
 * içerik taşarsa `scale` birkaç düzen turunda küçülür. Kapsayıcı belirgin büyürse (döndürme) ölçek 1'den yeniden başlar.
 * Ölçek yalnızca küçülür (titreşim/salınım olmasın). `scale` ile boşlukları, yazıları ve kartları çarpın.
 */
export function useFitScale(min: number = FIT_MIN_SCALE) {
    const [scale, setScale] = useState(1);
    const available = useRef(0);
    const content = useRef(0);
    const passes = useRef(0);

    const evaluate = useCallback(() => {
        if (!available.current || !content.current) return;
        setScale((current) => {
            const next = nextFitScale(current, available.current, content.current, min);
            if (next === current) { passes.current = 0; return current; }
            // Güvenlik: ardışık ölçek değişimi sınırı (düzen ölçümü kararsızsa sonsuz döngü olmasın).
            if (passes.current++ >= 12) return current;
            return next;
        });
    }, [min]);

    const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
        const h = e.nativeEvent.layout.height;
        if (Math.abs(h - available.current) < 1) return;
        const grew = available.current > 0 && h > available.current + 8;
        available.current = h;
        if (grew) { passes.current = 0; content.current = 0; setScale(1); return; }
        evaluate();
    }, [evaluate]);

    const onContentLayout = useCallback((e: LayoutChangeEvent) => {
        content.current = e.nativeEvent.layout.height;
        evaluate();
    }, [evaluate]);

    return { scale, onContainerLayout, onContentLayout };
}
