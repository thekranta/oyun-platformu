import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

// WorldMap — GERÇEK dünya haritası (SVG kıta silüetleri). Kıta köşe noktaları
// coğrafi enlem/boylamdan hesaplandı: x=(lon+180)*2.7778, y=(90-lat)*2.7778
// (ekvatoral projeksiyon, viewBox 1000x500). GELENEKSEL MONTESSORI renkleri.
// Dünya oyunları bu haritayı paylaşır.

export interface Continent {
    id: string;
    name: string;
    emoji: string;
    color: string;
    d: string;
    cx: number; cy: number;
}

export const CONTINENTS: Continent[] = [
    {
        id: 'kuzey-amerika', name: 'Kuzey Amerika', emoji: '🦅', color: '#F57C00', cx: 200, cy: 120,
        d: 'M33,67 L67,53 L153,56 L222,58 L272,47 L278,83 L264,97 L283,106 L306,83 L322,100 L353,117 L306,131 L294,139 L289,153 L278,172 L278,181 L269,172 L250,169 L239,169 L231,189 L256,205 L281,225 L264,222 L208,194 L194,186 L183,167 L161,147 L156,122 L144,111 L125,89 L83,83 Z',
    },
    {
        id: 'guney-amerika', name: 'Güney Amerika', emoji: '🦙', color: '#EC407A', cx: 335, cy: 320,
        d: 'M286,228 L328,222 L356,236 L403,267 L392,286 L389,311 L381,314 L367,328 L350,347 L342,356 L328,361 L319,381 L311,403 L300,394 L297,375 L294,353 L303,333 L306,300 L286,283 L275,267 L278,250 L283,239 Z',
    },
    {
        id: 'avrupa', name: 'Avrupa', emoji: '🏰', color: '#E53935', cx: 523, cy: 104,
        d: 'M475,142 L475,131 L489,117 L494,100 L514,83 L556,56 L578,67 L567,89 L553,100 L583,125 L564,139 L539,133 L544,144 L514,131 L500,139 L483,150 Z',
    },
    {
        id: 'afrika', name: 'Afrika', emoji: '🦁', color: '#388E3C', cx: 545, cy: 255,
        d: 'M483,150 L528,147 L569,161 L597,167 L642,217 L619,244 L611,261 L611,278 L600,306 L597,319 L589,331 L556,347 L550,342 L536,314 L533,292 L525,250 L514,239 L500,236 L481,236 L453,208 L453,194 L456,181 L464,172 L475,158 Z',
    },
    {
        id: 'asya', name: 'Asya', emoji: '🐼', color: '#FDD835', cx: 805, cy: 115,
        d: 'M578,136 L611,131 L639,125 L667,61 L778,47 L889,50 L1000,67 L944,94 L875,139 L839,164 L806,194 L800,217 L789,244 L772,208 L750,194 L722,208 L717,228 L703,200 L683,181 L667,189 L661,194 L644,208 L625,214 L611,194 L600,172 L611,153 L597,147 Z',
    },
    {
        id: 'okyanusya', name: 'Okyanusya', emoji: '🦘', color: '#8D6E63', cx: 868, cy: 325,
        d: 'M817,311 L861,283 L894,281 L883,294 L906,303 L925,328 L914,356 L875,347 L828,347 L817,328 Z',
    },
    {
        id: 'antarktika', name: 'Antarktika', emoji: '🐧', color: '#CFD8DC', cx: 500, cy: 478,
        d: 'M100,467 L250,458 L420,463 L560,456 L720,461 L880,458 L940,470 L940,496 L100,496 Z',
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
                <Rect x={0} y={0} width={1000} height={500} fill="#2AA0DE" />
                {CONTINENTS.map((c) => {
                    const isFound = found.has(c.id);
                    const isWrong = wrongId === c.id;
                    const isJust = justId === c.id;
                    const stroke = isWrong ? '#C62828' : isJust ? '#ffffff' : isFound ? '#1B5E20' : 'rgba(255,255,255,0.55)';
                    const strokeWidth = isWrong || isJust ? 6 : isFound ? 5 : 1.5;
                    const dark = c.id === 'asya' || c.id === 'antarktika';
                    return (
                        <React.Fragment key={c.id}>
                            <Path
                                d={c.d}
                                fill={c.color}
                                stroke={stroke}
                                strokeWidth={strokeWidth}
                                strokeLinejoin="round"
                                onPress={disabled || isFound ? undefined : () => onSelect?.(c.id)}
                                onPressIn={disabled || isFound ? undefined : () => onSelect?.(c.id)}
                            />
                            {(showLabels || isFound) && (
                                <SvgText
                                    x={c.cx} y={c.cy} fontSize={21} fontWeight="bold"
                                    fill={dark ? '#37474F' : '#ffffff'}
                                    textAnchor="middle" alignmentBaseline="middle"
                                >
                                    {c.name}
                                </SvgText>
                            )}
                            {isFound && (
                                <SvgText x={c.cx} y={c.cy - 24} fontSize={24} textAnchor="middle">✓</SvgText>
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
        width: '100%', maxWidth: 620, aspectRatio: 2, alignSelf: 'center',
        borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: '#1E88E5',
        backgroundColor: '#2AA0DE',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5,
    },
});
