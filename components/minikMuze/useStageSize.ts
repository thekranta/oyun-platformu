import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, View } from 'react-native';

// Müze oyunlarının "sahne" (tablonun durduğu alan) ölçüsü. Web'de onLayout bazı açılışlarda hiç gelmiyor
// (ölçü tahmin değerinde kalıp tablo kırpılıyordu); bu yüzden web'de sahne ayrıca DOM'dan ResizeObserver ile ölçülür.
// Native'de onLayout yeterlidir.

export interface StageSize { w: number; h: number }

const same = (a: StageSize, b: StageSize) => Math.abs(a.w - b.w) < 1 && Math.abs(a.h - b.h) < 1;

export function useStageSize(initial: StageSize) {
    const ref = useRef<View>(null);
    const [size, setSize] = useState<StageSize>(initial);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) => (same(prev, { w: width, h: height }) ? prev : { w: width, h: height }));
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web' || typeof ResizeObserver === 'undefined') return;
        const node = ref.current as unknown as HTMLElement | null;
        if (!node) return;
        const measure = () => {
            const r = node.getBoundingClientRect();
            setSize((prev) => (same(prev, { w: r.width, h: r.height }) ? prev : { w: r.width, h: r.height }));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(node);
        return () => ro.disconnect();
    }, []);

    return { ref, size, onLayout };
}
