import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { radarColorFor } from '../lib/radarColors';
import type { RadarChartPoint } from '../services/ReportEngine';

// ============================================
// 🎯 GELİŞİM RADAR GRAFİĞİ — veli ve öğretmen panelinde ortak.
// Her ölçüt kendi renginde: eksen çizgisi, veri noktası ve alttaki etiket aynı renkte olduğundan
// hangi noktanın hangi ölçüt olduğu renkten okunur.
// ============================================

const SIZE = 180;
const RADIUS = 70;
const LEVELS = 4;
const PAD_X = 30;
const PAD_Y = 20;
const CENTER = SIZE / 2;

interface Props {
    data: RadarChartPoint[];
    textColor?: string;
}

export default function DevelopmentRadar({ data, textColor = '#2D3436' }: Props) {
    if (data.length === 0) return null;

    const cx = CENTER + PAD_X;
    const cy = CENTER + PAD_Y;
    const angleStep = (2 * Math.PI) / data.length;
    const points = data.map((p, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = (Math.max(0, Math.min(100, p.value)) / 100) * RADIUS;
        return {
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
            ex: cx + RADIUS * Math.cos(angle),
            ey: cy + RADIUS * Math.sin(angle),
            color: radarColorFor(p.category, i),
            label: p.label,
            value: p.value,
        };
    });

    return (
        <View style={styles.wrap}>
            <Svg height={SIZE + 40} width={SIZE + 60}>
                {Array.from({ length: LEVELS }, (_, i) => (
                    <Circle key={'c' + i} cx={cx} cy={cy} r={RADIUS * ((i + 1) / LEVELS)} fill="none" stroke="#E0E0E0" strokeWidth="1" />
                ))}

                {/* Eksenler: her biri kendi ölçütünün renginde */}
                {points.map((p, i) => (
                    <Line key={'l' + i} x1={cx} y1={cy} x2={p.ex} y2={p.ey} stroke={p.color} strokeOpacity={0.55} strokeWidth="2" />
                ))}

                <Polygon
                    points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="rgba(30, 136, 229, 0.18)"
                    stroke="#90A4AE"
                    strokeWidth="1.5"
                />

                {points.map((p, i) => (
                    <Circle key={'d' + i} cx={p.x} cy={p.y} r="6.5" fill={p.color} stroke="#FFF" strokeWidth="2" />
                ))}
            </Svg>

            <View style={styles.legend}>
                {points.map((p, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: p.color + '1F', borderColor: p.color + '66' }]}>
                        <View style={[styles.dot, { backgroundColor: p.color }]} />
                        <Text style={[styles.chipText, { color: textColor }]}>{p.label}: {p.value}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { alignItems: 'center' },
    legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginVertical: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
    dot: { width: 11, height: 11, borderRadius: 6, marginRight: 6 },
    chipText: { fontSize: 11, fontWeight: '600' },
});
