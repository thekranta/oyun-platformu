import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

// WorldMap — yeniden kullanılabilir GERÇEK dünya haritası (SVG kıta silüetleri).
// Kıtalar doğru göreli konumlarda, tanınabilir şekillerle; GELENEKSEL MONTESSORI
// kıta renkleri (Afrika yeşil, Avrupa kırmızı, Asya sarı, K.Amerika turuncu,
// G.Amerika pembe, Okyanusya kahverengi, Antarktika beyaz). viewBox 1000x500
// (ekvatoral ~2:1). Dünya oyunları bunu paylaşır.

export interface Continent {
    id: string;
    name: string;
    emoji: string;
    color: string;
    d: string;      // SVG path
    cx: number; cy: number; // etiket merkezi
}

export const CONTINENTS: Continent[] = [
    {
        id: 'kuzey-amerika', name: 'Kuzey Amerika', emoji: '🦅', color: '#FB8C00', cx: 235, cy: 135,
        d: 'M60,72 L150,50 L295,54 L360,86 L370,140 L360,185 L361,210 L338,206 L315,229 L292,215 L268,206 L252,150 L212,96 L150,88 Z',
    },
    {
        id: 'guney-amerika', name: 'Güney Amerika', emoji: '🦙', color: '#EC407A', cx: 345, cy: 300,
        d: 'M300,224 L360,218 L398,250 L402,286 L378,330 L352,378 L326,405 L318,360 L300,320 L286,278 L292,236 Z',
    },
    {
        id: 'avrupa', name: 'Avrupa', emoji: '🏰', color: '#E53935', cx: 535, cy: 100,
        d: 'M474,96 L500,70 L536,60 L566,72 L600,86 L604,112 L576,132 L534,140 L500,126 L480,110 Z',
    },
    {
        id: 'afrika', name: 'Afrika', emoji: '🦁', color: '#43A047', cx: 548, cy: 240,
        d: 'M470,150 L556,150 L612,166 L640,206 L632,250 L590,300 L558,346 L534,320 L512,286 L500,252 L474,224 L452,200 L456,172 Z',
    },
    {
        id: 'asya', name: 'Asya', emoji: '🐼', color: '#FDD835', cx: 800, cy: 120,
        d: 'M612,108 L628,64 L720,48 L840,46 L946,66 L982,110 L968,150 L930,166 L860,180 L790,224 L762,206 L730,200 L700,214 L676,190 L648,176 L628,150 Z',
    },
    {
        id: 'okyanusya', name: 'Okyanusya', emoji: '🦘', color: '#8D6E63', cx: 870, cy: 326,
        d: 'M820,302 L878,290 L924,312 L916,348 L862,362 L822,342 Z',
    },
    {
        id: 'antarktika', name: 'Antarktika', emoji: '🐧', color: '#ECEFF1', cx: 500, cy: 476,
        d: 'M120,458 L300,448 L520,452 L720,446 L880,458 L880,494 L120,494 Z',
    },
];

interface Props {
    foundIds?: Set<string>;
    wrongId?: string | null;
    justId?: string | null;
    onSelect?: (id: string) => void;
    showLabels?: boolean;
    disabled?: boolean;
}

export default function WorldMap({ foundIds, wrongId, justId, onSelect, showLabels, disabled }: Props) {
    const found = foundIds ?? new Set<string>();

    return (
        <View style={styles.wrap}>
            <Svg viewBox="0 0 1000 500" width="100%" height="100%">
                {/* Okyanus */}
                <Rect x={0} y={0} width={1000} height={500} fill="#90CAF9" />
                <SvgText x={930} y={40} fontSize={30} opacity={0.55}>🌊</SvgText>
                <SvgText x={40} y={260} fontSize={30} opacity={0.55}>🐳</SvgText>
                <SvgText x={430} y={430} fontSize={26} opacity={0.5}>⛵</SvgText>

                {CONTINENTS.map((c) => {
                    const isFound = found.has(c.id);
                    const isWrong = wrongId === c.id;
                    const isJust = justId === c.id;
                    const stroke = isWrong ? '#C62828' : isJust ? '#ffffff' : isFound ? '#2E7D32' : 'rgba(255,255,255,0.85)';
                    const strokeWidth = isWrong || isJust ? 6 : isFound ? 5 : 2.5;
                    return (
                        <React.Fragment key={c.id}>
                            <Path
                                d={c.d}
                                fill={c.color}
                                stroke={stroke}
                                strokeWidth={strokeWidth}
                                strokeLinejoin="round"
                                opacity={disabled && !isFound ? 0.9 : 1}
                                onPress={disabled || isFound ? undefined : () => onSelect?.(c.id)}
                                onPressIn={disabled || isFound ? undefined : () => onSelect?.(c.id)}
                            />
                            {(showLabels || isFound) && (
                                <SvgText
                                    x={c.cx} y={c.cy} fontSize={22} fontWeight="bold"
                                    fill={c.id === 'asya' || c.id === 'antarktika' ? '#37474F' : '#ffffff'}
                                    textAnchor="middle" alignmentBaseline="middle"
                                    stroke="rgba(0,0,0,0.25)" strokeWidth={0.6}
                                >
                                    {c.name}
                                </SvgText>
                            )}
                            {isFound && (
                                <SvgText x={c.cx} y={c.cy - 26} fontSize={26} textAnchor="middle">✓</SvgText>
                            )}
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: '100%', maxWidth: 600, aspectRatio: 2, alignSelf: 'center',
        borderRadius: 18, overflow: 'hidden', borderWidth: 3, borderColor: '#64B5F6',
        backgroundColor: '#90CAF9',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5,
    },
});
