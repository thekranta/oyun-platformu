// Minik Müze: tabloyu sahneye sığdırma ve "şu noktaya yakınlaş" dönüşümü (saf, test edilebilir).
import type { MuseumFocus } from '../constants/minikMuze';

export interface Size { w: number; h: number }
export interface FocusTransform { scale: number; tx: number; ty: number }

/** En-boy oranı (genişlik/yükseklik) korunarak kutuya sığdırılmış (contain) boyut; kutu boşsa 0. */
export function fitContain(boxW: number, boxH: number, aspect: number): Size {
    if (boxW <= 0 || boxH <= 0 || !(aspect > 0)) return { w: 0, h: 0 };
    return boxW / boxH > aspect ? { w: boxH * aspect, h: boxH } : { w: boxW, h: boxW / aspect };
}

/**
 * Tablonun (iw x ih) merkezine göre dönüşüm: focus noktası sahnenin ortasına gelsin.
 * Sıra: translate -> scale; tablonun kenarından boşluk görünmesin diye kaydırma sınırlanır.
 * focus = null: tüm tablo (scale 1, kayma yok).
 */
export function focusTransform(iw: number, ih: number, focus: MuseumFocus | null): FocusTransform {
    if (!focus || iw <= 0 || ih <= 0) return { scale: 1, tx: 0, ty: 0 };
    const s = Math.max(1, focus.scale);
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
    const dx = (Math.min(1, Math.max(0, focus.x)) - 0.5) * iw;
    const dy = (Math.min(1, Math.max(0, focus.y)) - 0.5) * ih;
    return {
        scale: s,
        tx: clamp(-s * dx, ((s - 1) * iw) / 2),
        ty: clamp(-s * dy, ((s - 1) * ih) / 2),
    };
}
