import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { Flag, FLAGS, FlagSpec } from './WorldFlag';

// Bayrak Boya — çizim/sanat + kültür. Referans bayrağa bakarak boş şeritleri
// doğru renklerle boya. Montessori: referans görünür (kontrollü hata), ceza yok,
// çocuk istediği gibi yeniden boyayabilir. Maarif: TAEOB.6 (yazma öncesi/boyama)
// + kültürel farkındalık. Yalnızca şerit tipi bayraklar (dikey/yatay).

interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        finalHamle: number,
        finalHata: number,
        algilananKelime?: string,
        extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string },
    ) => void;
    onExit?: () => void;
    childName?: string;
}

type StripeFlag = Extract<FlagSpec, { render: 'v' | 'h' }>;
const STRIPE_FLAGS = FLAGS.filter((f): f is StripeFlag => f.render === 'v' || f.render === 'h');
const ROUNDS = 6;
const EXTRA_COLORS = ['#000000', '#ffffff', '#0055A4', '#EF4135', '#FCD116', '#009246', '#7E57C2', '#FF9800'];

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

function buildPalette(colors: string[]): string[] {
    const uniq = Array.from(new Set(colors));
    const extras = shuffle(EXTRA_COLORS.filter(c => !uniq.includes(c))).slice(0, Math.max(1, 5 - uniq.length));
    return shuffle(Array.from(new Set([...uniq, ...extras])));
}

export default function BayrakBoya({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const flags = useMemo(() => shuffle(STRIPE_FLAGS).slice(0, ROUNDS), []);

    const [round, setRound] = useState(0);
    const spec = flags[round];
    const [fills, setFills] = useState<(string | null)[]>(() => spec.colors.map(() => null));
    const [palette, setPalette] = useState<string[]>(() => buildPalette(spec.colors));
    const [selected, setSelected] = useState<string>(() => buildPalette(spec.colors)[0]);
    const [solved, setSolved] = useState(false);
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const bump = useRef(new Animated.Value(1)).current;

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const setupRound = (r: number) => {
        const s = flags[r];
        const pal = buildPalette(s.colors);
        setFills(s.colors.map(() => null));
        setPalette(pal);
        setSelected(pal[0]);
        setSolved(false);
        lockRef.current = false;
    };

    const paintZone = (i: number) => {
        if (lockRef.current) return;
        movesRef.current += 1;
        // yanlış renk (hedefle uymuyorsa) nazik hata sayımı — ama serbestçe düzeltilebilir
        if (selected !== spec.colors[i]) errorsRef.current += 1;

        const next = [...fills];
        next[i] = selected;
        setFills(next);

        if (next.every((c, idx) => c === spec.colors[idx])) {
            lockRef.current = true;
            setSolved(true);
            Animated.sequence([
                Animated.timing(bump, { toValue: 1.12, duration: 160, useNativeDriver: true }),
                Animated.timing(bump, { toValue: 1, duration: 160, useNativeDriver: true }),
            ]).start();
            startTimer(setTimeout(() => {
                if (round >= ROUNDS - 1) {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd('bayrak-boya', duration, movesRef.current, errorsRef.current, undefined, {
                        zorlukSeviyesi: 1,
                        kazanimOdagi: 'TAEOB.6 Boyama + kültürel farkındalık (bayraklar)',
                    });
                } else {
                    const nr = round + 1;
                    setRound(nr);
                    setupRound(nr);
                }
            }, 1300));
        }
    };

    const zoneW = 240, zoneH = 160;

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#37474F" />
                    </TouchableOpacity>
                    <Text style={styles.title}>🎨 Bayrak Boya</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{round + 1}/{ROUNDS}</Text>
                    </View>
                </View>

                {/* Referans */}
                <View style={styles.refRow}>
                    <Text style={styles.refLabel}>Örnek:</Text>
                    <Flag spec={spec} w={64} />
                    <Text style={styles.refName}>{spec.name}</Text>
                </View>

                {/* Boyanacak boş bayrak */}
                <Animated.View style={[styles.canvas, { width: zoneW, height: zoneH, flexDirection: spec.render === 'v' ? 'row' : 'column', transform: [{ scale: bump }] }]}>
                    {spec.colors.map((_, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.zone, { flex: 1, backgroundColor: fills[i] || '#ECEFF1' }]}
                            onPress={() => paintZone(i)}
                            activeOpacity={0.8}
                            disabled={solved}
                        >
                            {!fills[i] && <Text style={styles.zoneQ}>?</Text>}
                        </TouchableOpacity>
                    ))}
                </Animated.View>

                {solved && <Text style={styles.solvedText}>Harika! {spec.name} bayrağı hazır 🎉</Text>}

                {/* Renk paleti */}
                <Text style={styles.paletteLabel}>Renk seç, sonra şeride dokun</Text>
                <View style={styles.palette}>
                    {palette.map((c) => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.swatch, { backgroundColor: c }, selected === c && styles.swatchSelected]}
                            onPress={() => setSelected(c)}
                            activeOpacity={0.8}
                        >
                            {selected === c && <Ionicons name="checkmark" size={20} color={c === '#ffffff' || c === '#FCD116' ? '#333' : '#fff'} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    interaction="tap"
                    message="Örnek bayrağa bak, renkleri seçip şeritleri doğru boya! Acele yok."
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => { startTimeRef.current = Date.now(); setGameReady(true); }}
                />
            )}
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, alignItems: 'center' },
    header: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    exitBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    title: { fontSize: 19, fontWeight: 'bold', color: '#263238' },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    countText: { fontSize: 14, fontWeight: 'bold', color: '#00796B' },

    refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16, marginBottom: 16 },
    refLabel: { fontSize: 13, color: '#607D8B', fontWeight: '700' },
    refName: { fontSize: 16, fontWeight: '800', color: '#263238' },

    canvas: {
        borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: '#B0BEC5', elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 5,
    },
    zone: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)' },
    zoneQ: { fontSize: 30, color: '#B0BEC5', fontWeight: '900' },

    solvedText: { fontSize: 16, fontWeight: '800', color: '#2E7D32', marginTop: 14, textAlign: 'center' },

    paletteLabel: { fontSize: 13, color: '#546E7A', fontWeight: '600', marginTop: 22, marginBottom: 10 },
    palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    swatch: {
        width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: 'rgba(0,0,0,0.15)',
        alignItems: 'center', justifyContent: 'center', elevation: 3,
    },
    swatchSelected: { borderWidth: 4, borderColor: '#37474F', transform: [{ scale: 1.12 }] },
});
