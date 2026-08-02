import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';

// WorldMap — GERÇEK dünya haritası (SVG kıta silüetleri). Kıta köşe noktaları
// coğrafi enlem/boylamdan hesaplandı: x=(lon+180)*2.7778, y=(90-lat)*2.7778
// (ekvatoral projeksiyon, viewBox 1000x500). Bol kıyı noktası → tanınabilir
// şekiller. GELENEKSEL MONTESSORI renkleri. Dünya oyunları bu haritayı paylaşır.

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
        id: 'kuzey-amerika', name: 'Kuzey Amerika', emoji: '🦅', color: '#F57C00', cx: 205, cy: 120,
        d: 'M39,61 L50,56 L67,53 L111,56 L144,56 L181,58 L208,61 L236,56 L264,61 L272,47 L283,50 L292,61 L278,72 L283,83 L272,97 L281,108 L322,83 L322,100 L344,108 L353,119 L317,128 L306,136 L294,139 L292,147 L289,153 L275,164 L278,175 L278,181 L269,169 L256,167 L239,169 L231,178 L231,192 L236,200 L244,200 L256,192 L258,206 L269,208 L281,225 L267,219 L236,206 L208,194 L194,183 L183,167 L172,156 L161,144 L156,128 L153,117 L139,97 L125,89 L111,83 L83,83 L61,78 Z',
    },
    {
        id: 'guney-amerika', name: 'Güney Amerika', emoji: '🦙', color: '#EC407A', cx: 329, cy: 305,
        d: 'M286,228 L300,219 L328,222 L333,233 L356,236 L361,250 L378,256 L394,261 L403,267 L392,286 L392,300 L386,311 L367,319 L367,328 L353,344 L339,356 L328,361 L319,375 L311,389 L308,400 L303,397 L297,375 L297,353 L303,333 L306,314 L303,300 L286,283 L275,267 L275,256 L278,247 L283,236 Z',
    },
    {
        id: 'avrupa', name: 'Avrupa', emoji: '🏰', color: '#E53935', cx: 540, cy: 106,
        d: 'M475,147 L475,131 L494,131 L489,117 L500,111 L506,108 L522,100 L522,92 L528,89 L517,89 L514,78 L531,72 L542,61 L558,56 L572,53 L583,56 L578,67 L567,83 L583,97 L589,122 L606,122 L583,125 L578,136 L567,139 L553,139 L544,139 L550,133 L536,128 L519,128 L508,131 L500,139 L483,150 Z',
    },
    {
        id: 'afrika', name: 'Afrika', emoji: '🦁', color: '#388E3C', cx: 545, cy: 250,
        d: 'M483,150 L494,150 L514,147 L531,147 L553,158 L569,161 L583,164 L592,164 L597,172 L603,186 L606,200 L619,217 L633,219 L642,217 L625,236 L617,250 L611,261 L611,278 L608,292 L597,306 L597,317 L592,325 L583,333 L575,342 L556,347 L550,342 L542,325 L536,314 L533,297 L536,278 L525,253 L525,242 L514,239 L500,236 L489,236 L478,239 L464,228 L456,217 L453,208 L453,194 L456,183 L464,172 L472,164 Z',
    },
    {
        id: 'asya', name: 'Asya', emoji: '🐼', color: '#FDD835', cx: 790, cy: 110,
        d: 'M583,139 L600,133 L611,131 L631,139 L639,125 L653,111 L667,97 L681,61 L694,50 L722,47 L778,39 L806,44 L861,47 L889,50 L944,56 L972,61 L1000,67 L994,69 L972,83 L950,83 L931,97 L903,111 L894,100 L875,117 L861,131 L847,139 L839,164 L828,183 L806,192 L800,208 L792,222 L789,242 L778,231 L772,222 L769,206 L756,192 L744,189 L722,208 L714,228 L703,208 L694,194 L686,183 L672,181 L658,181 L664,203 L656,217 L644,217 L633,214 L625,214 L619,203 L611,194 L606,183 L597,172 L594,164 L600,150 Z',
    },
    {
        id: 'okyanusya', name: 'Okyanusya', emoji: '🦘', color: '#8D6E63', cx: 871, cy: 322,
        d: 'M817,311 L817,322 L822,336 L833,344 L850,339 L864,336 L881,347 L889,356 L906,356 L917,353 L925,336 L925,319 L906,303 L894,281 L878,283 L881,294 L861,286 L850,289 L839,300 Z',
    },
    {
        id: 'antarktika', name: 'Antarktika', emoji: '🐧', color: '#CFD8DC', cx: 500, cy: 470,
        d: 'M6,450 L111,439 L222,453 L333,444 L444,450 L556,442 L667,453 L778,444 L889,450 L994,444 L994,494 L6,494 Z',
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
                                    x={c.cx} y={c.cy} fontSize={20} fontWeight="bold"
                                    fill={dark ? '#37474F' : '#ffffff'}
                                    textAnchor="middle" alignmentBaseline="middle"
                                >
                                    {c.name}
                                </SvgText>
                            )}
                            {isFound && (
                                <SvgText x={c.cx} y={c.cy - 22} fontSize={22} textAnchor="middle">✓</SvgText>
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
