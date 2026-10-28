// Sınıf Bahçesi çizimleri (PlantArt/SkyArt) Reanimated kullanır; Reanimated web'de ~0,7 MB (ham) tutar ve
// öğretmen/veli paneli dışında hiçbir yerde gerekmez. Bu yüzden çizimler ilk gösterildikleri anda ayrı bir
// parça olarak iner (oyunlardaki lazyWithReload deseni); ana paket Reanimated'dan arınır. Ekran gelene kadar
// aynı boyutta boş bir kutu durur, yerleşim zıplamaz (RewardCard da kutuyu zaten ayırır).
import React, { Suspense } from 'react';
import { View } from 'react-native';
import { lazyWithReload } from '../../../lib/lazyWithReload';
import type { RewardConceptArtProps } from '../types';

type ArtName = 'PlantArt' | 'SkyArt';

export function lazyArt(name: ArtName): React.ComponentType<RewardConceptArtProps> {
    const Lazy = lazyWithReload(() => import('./arts').then((m) => ({ default: m[name] })));
    return function LazyArt(props: RewardConceptArtProps) {
        return (
            <Suspense fallback={<View style={{ width: props.size, height: (props.size * 170) / 120 }} />}>
                <Lazy {...props} />
            </Suspense>
        );
    };
}
