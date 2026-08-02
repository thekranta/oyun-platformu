import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { Flag, FLAGS } from './WorldFlag';

// Dünya Selamları — MONTESSORI kültürel çalışma. Farklı ülkeler farklı "merhaba"
// der. Hedefte selam sözü + ülke adı; çocuk o ülkenin bayrağını bulur.
// Puan/yarış YOK, kendi kendini düzeltir. Maarif: SAB.2 (kültürel unsurlar).

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

const BOARD_SIZE = 8;

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export default function DunyaSelamlari({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const board = useMemo(() => shuffle(FLAGS).slice(0, BOARD_SIZE), []);
    const targetOrder = useMemo(() => shuffle(board.map((_, i) => i)), [board]);

    const [found, setFound] = useState<Set<string>>(new Set());
    const [wrongId, setWrongId] = useState<string | null>(null);
    const [justFound, setJustFound] = useState<string | null>(null);
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const shakeMap = useRef<Record<string, Animated.Value>>({});

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };
    const shakeFor = (id: string) => {
        if (!shakeMap.current[id]) shakeMap.current[id] = new Animated.Value(0);
        return shakeMap.current[id];
    };

    const targetIndex = targetOrder.find(i => !found.has(board[i].id));
    const target = targetIndex !== undefined ? board[targetIndex] : null;
    const allDone = target === null;

    const handleTap = (id: string) => {
        if (lockRef.current || allDone || !target) return;
        if (found.has(id)) return;
        movesRef.current += 1;

        if (id === target.id) {
            const nf = new Set(found); nf.add(id);
            setFound(nf);
            setJustFound(id);
            startTimer(setTimeout(() => setJustFound(null), 900));

            if (nf.size === board.length) {
                lockRef.current = true;
                startTimer(setTimeout(() => {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd('dunya-selamlari', duration, movesRef.current, errorsRef.current, undefined, {
                        zorlukSeviyesi: 1,
                        kazanimOdagi: 'SAB.2 Kültürel unsurları tanıma (dünya selamları) — Montessori',
                    });
                }, 1600));
            }
        } else {
            errorsRef.current += 1;
            setWrongId(id);
            const sh = shakeFor(id);
            Animated.sequence([
                Animated.timing(sh, { toValue: 7, duration: 55, useNativeDriver: true }),
                Animated.timing(sh, { toValue: -7, duration: 55, useNativeDriver: true }),
                Animated.timing(sh, { toValue: 0, duration: 55, useNativeDriver: true }),
            ]).start();
            startTimer(setTimeout(() => setWrongId(null), 500));
        }
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#37474F" />
                    </TouchableOpacity>
                    <Text style={styles.title}>👋 Dünya Selamları</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{found.size}/{board.length}</Text>
                    </View>
                </View>

                {/* Hedef: selam sözü + ülke adı */}
                {target && !allDone && (
                    <View style={styles.targetCard}>
                        <Text style={styles.wave}>👋</Text>
                        <Text style={styles.hello}>“{target.hello}”</Text>
                        <Text style={styles.targetLabel}>{target.name} böyle selam verir — bayrağını bul</Text>
                    </View>
                )}
                {allDone && (
                    <View style={styles.targetCard}>
                        <Text style={styles.wave}>🌍✨</Text>
                        <Text style={styles.doneText}>Aferin! Tüm ülkeleri selamladın.</Text>
                    </View>
                )}

                {/* Bayraklar */}
                <View style={styles.grid}>
                    {board.map((spec) => {
                        const isFound = found.has(spec.id);
                        const isJust = justFound === spec.id;
                        const isWrong = wrongId === spec.id;
                        return (
                            <Animated.View key={spec.id} style={{ transform: [{ translateX: shakeFor(spec.id) }] }}>
                                <TouchableOpacity
                                    style={[styles.slot, isFound && styles.slotFound, isJust && styles.slotJust, isWrong && styles.slotWrong]}
                                    onPress={() => handleTap(spec.id)}
                                    activeOpacity={0.9}
                                    disabled={isFound || allDone}
                                >
                                    <Flag spec={spec} w={82} />
                                    <Text style={styles.slotName}>{spec.name}</Text>
                                    {isFound && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>

                <Text style={styles.hint}>
                    {allDone ? 'Dünyayı selamladın! 🌏' : 'Bu selamı veren ülkenin bayrağına dokun'}
                </Text>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    interaction="tap"
                    message="Her ülke farklı 'merhaba' der! Selamı veren ülkenin bayrağını bul."
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
    header: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    exitBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    title: { fontSize: 19, fontWeight: 'bold', color: '#263238' },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    countText: { fontSize: 14, fontWeight: 'bold', color: '#00796B' },

    targetCard: {
        alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 24,
        marginBottom: 18, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, maxWidth: 340,
    },
    wave: { fontSize: 40 },
    hello: { fontSize: 30, fontWeight: '900', color: '#00695C', marginTop: 4 },
    targetLabel: { fontSize: 13, color: '#546E7A', fontWeight: '600', marginTop: 8, textAlign: 'center' },
    doneText: { fontSize: 17, fontWeight: '800', color: '#2E7D32', marginTop: 8, textAlign: 'center' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 520 },
    slot: {
        width: 104, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 2, borderColor: '#E0E0E0',
        alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6,
    },
    slotFound: { borderColor: '#66BB6A', backgroundColor: '#F1F8E9' },
    slotJust: { borderColor: '#43A047', backgroundColor: '#E8F5E9' },
    slotWrong: { borderColor: '#EF9A9A' },
    slotName: { fontSize: 12, fontWeight: '700', color: '#37474F', marginTop: 6, textAlign: 'center' },
    check: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center', elevation: 3 },
    checkText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    hint: { fontSize: 14, color: '#455A64', marginTop: 20, fontWeight: '600', textAlign: 'center' },
});
