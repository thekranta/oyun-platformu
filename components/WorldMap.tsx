import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// WorldMap — yeniden kullanılabilir stilize dünya haritası. Kıtalar harita-benzeri
// bir düzende yumuşak bloklar olarak yerleştirilir; GELENEKSEL MONTESSORI kıta
// renkleri kullanılır (Afrika yeşil, Avrupa kırmızı, Asya sarı, K.Amerika turuncu,
// G.Amerika pembe, Okyanusya kahverengi). Dünya ile ilgili oyunlar bunu paylaşır.
// Şekiller coğrafi olarak birebir değil; okul öncesi için öğrenilebilir bir yerleşim.

export interface Continent {
    id: string;
    name: string;
    emoji: string;
    top: number; left: number; width: number; height: number; // yüzde (%)
    color: string;
}

export const CONTINENTS: Continent[] = [
    { id: 'kuzey-amerika', name: 'Kuzey Amerika', emoji: '🦅', top: 6, left: 3, width: 31, height: 36, color: '#FB8C00' },
    { id: 'guney-amerika', name: 'Güney Amerika', emoji: '🦙', top: 50, left: 17, width: 21, height: 44, color: '#EC407A' },
    { id: 'avrupa', name: 'Avrupa', emoji: '🏰', top: 7, left: 41, width: 17, height: 22, color: '#E53935' },
    { id: 'afrika', name: 'Afrika', emoji: '🦁', top: 33, left: 41, width: 23, height: 45, color: '#43A047' },
    { id: 'asya', name: 'Asya', emoji: '🐼', top: 6, left: 60, width: 36, height: 40, color: '#FDD835' },
    { id: 'okyanusya', name: 'Okyanusya', emoji: '🦘', top: 62, left: 75, width: 21, height: 26, color: '#8D6E63' },
];

interface Props {
    foundIds?: Set<string>;
    wrongId?: string | null;
    justId?: string | null;
    onSelect?: (id: string) => void;
    showLabels?: boolean;   // kıta adlarını her zaman göster (aksi halde yalnız bulununca)
    disabled?: boolean;
}

export default function WorldMap({ foundIds, wrongId, justId, onSelect, showLabels, disabled }: Props) {
    const found = foundIds ?? new Set<string>();
    return (
        <View style={styles.ocean}>
            {/* dekoratif okyanus öğeleri */}
            <Text style={[styles.deco, { top: '4%', right: '4%' }]}>🌊</Text>
            <Text style={[styles.deco, { bottom: '6%', left: '4%' }]}>⛵</Text>
            <Text style={[styles.deco, { top: '46%', left: '2%' }]}>🐳</Text>

            {CONTINENTS.map((c) => {
                const isFound = found.has(c.id);
                const isWrong = wrongId === c.id;
                const isJust = justId === c.id;
                const showName = showLabels || isFound;
                return (
                    <TouchableOpacity
                        key={c.id}
                        style={[
                            styles.land,
                            {
                                top: `${c.top}%`, left: `${c.left}%`, width: `${c.width}%`, height: `${c.height}%`,
                                backgroundColor: c.color,
                            },
                            isFound && styles.landFound,
                            isWrong && styles.landWrong,
                            isJust && styles.landJust,
                        ]}
                        onPress={() => onSelect?.(c.id)}
                        activeOpacity={0.85}
                        disabled={disabled || isFound}
                    >
                        <Text style={styles.landEmoji}>{c.emoji}</Text>
                        {showName && <Text style={styles.landName} numberOfLines={2}>{c.name}</Text>}
                        {isFound && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    ocean: {
        width: '100%', maxWidth: 560, aspectRatio: 1.7, backgroundColor: '#90CAF9',
        borderRadius: 20, overflow: 'hidden', position: 'relative', alignSelf: 'center',
        borderWidth: 3, borderColor: '#64B5F6',
    },
    deco: { position: 'absolute', fontSize: 22, opacity: 0.7 },
    land: {
        position: 'absolute', borderRadius: 26, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', padding: 4,
        ...(({ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 }) as object),
    },
    landFound: { borderColor: '#2E7D32', borderWidth: 3 },
    landWrong: { borderColor: '#C62828', borderWidth: 4 },
    landJust: { borderColor: '#FFF', borderWidth: 4 },
    landEmoji: { fontSize: 30 },
    landName: { fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    check: { position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center' },
    checkText: { color: '#fff', fontSize: 12, fontWeight: '900' },
});
