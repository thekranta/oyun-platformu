import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { Flag, FLAGS, FlagSpec } from './WorldFlag';
import { speak } from '../services/speechService';

// Dünya Bayrakları — MONTESSORI tarzı kültürel farkındalık çalışması.
// Puan/yarış YOK; kendi kendini düzelten (yanlış nazikçe titrer), doğru
// eşleşmede ülke adı görünür (nomenklatür). Amaç: tüm bayrakları eşleştirmek.
// Maarif: SAB.2 (36-48) — Toplumsal yaşama yönelik kültürel unsurları çözümleme.
//
// Bayraklar emoji DEĞİL, basit renkli View'larla çizilir → her cihazda aynı görünür.

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
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export default function DunyaBayraklari({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
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

    // Sıradaki hedef: targetOrder'da henüz bulunmayan ilk bayrak
    const targetIndex = targetOrder.find(i => !found.has(board[i].id));
    const target = targetIndex !== undefined ? board[targetIndex] : null;
    const allDone = target === null;

    const handleTap = (spec: FlagSpec) => {
        if (lockRef.current || allDone || !target) return;
        if (found.has(spec.id)) return;
        movesRef.current += 1;

        if (spec.id === target.id) {
            const nf = new Set(found); nf.add(spec.id);
            setFound(nf);
            setJustFound(spec.id);
            startTimer(setTimeout(() => setJustFound(null), 900));

            if (nf.size === board.length) {
                lockRef.current = true;
                startTimer(setTimeout(() => {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd('dunya-bayraklari', duration, movesRef.current, errorsRef.current, undefined, {
                        zorlukSeviyesi: 1,
                        kazanimOdagi: 'SAB.2 Kültürel unsurları tanıma (dünya bayrakları) — Montessori',
                    });
                }, 1600));
            }
        } else {
            errorsRef.current += 1;
            setWrongId(spec.id);
            const sh = shakeFor(spec.id);
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
                        <Text style={styles.exitIcon}>🚪</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>🌍 Dünya Bayrakları</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{found.size}/{board.length}</Text>
                    </View>
                </View>

                {/* Hedef (nomenklatür kartı) */}
                {target && !allDone && (
                    <View style={styles.targetCard}>
                        <Text style={styles.targetLabel}>Bunun aynısını bul</Text>
                        <Flag spec={target} w={120} />
                        <Text style={styles.targetName}>{target.name}</Text>
                        <TouchableOpacity
                            style={styles.listenBtn}
                            onPress={() => speak('Dünyanın farklı ülkelerinden bayraklar! Aynı olanı sakince bul ve eşleştir.', { instructions: HAPPY_VOICE })}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="volume-high" size={20} color="#fff" />
                            <Text style={styles.listenText}>Tekrar Dinle</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {allDone && (
                    <View style={styles.targetCard}>
                        <Text style={styles.doneEmoji}>🌍✨</Text>
                        <Text style={styles.doneText}>Aferin! Tüm bayrakları eşleştirdin.</Text>
                    </View>
                )}

                {/* Bayrak koleksiyonu */}
                <View style={styles.grid}>
                    {board.map((spec) => {
                        const isFound = found.has(spec.id);
                        const isJust = justFound === spec.id;
                        const isWrong = wrongId === spec.id;
                        return (
                            <Animated.View key={spec.id} style={{ transform: [{ translateX: shakeFor(spec.id) }] }}>
                                <TouchableOpacity
                                    style={[styles.slot, isFound && styles.slotFound, isJust && styles.slotJust, isWrong && styles.slotWrong]}
                                    onPress={() => handleTap(spec)}
                                    activeOpacity={0.9}
                                    disabled={isFound || allDone}
                                >
                                    <Flag spec={spec} w={82} />
                                    {isFound
                                        ? <Text style={styles.slotName}>{spec.name}</Text>
                                        : <Text style={styles.slotNamePlaceholder}> </Text>}
                                    {isFound && <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>

                <Text style={styles.hint}>
                    {allDone ? 'Dünyayı gezdin! 🌏' : 'Yukarıdaki bayrağın aynısına dokun — acele yok'}
                </Text>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    interaction="tap"
                    message="Dünyanın farklı ülkelerinden bayraklar! Aynı olanı sakince bul ve eşleştir."
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
    exitBtn: { position: 'absolute', bottom: 30, left: 20, backgroundColor: '#FF5252', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', zIndex: 100, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, borderWidth: 3, borderColor: '#FFF' },
    exitIcon: { fontSize: 30, color: 'white' },
    title: { fontSize: 19, fontWeight: 'bold', color: '#263238' },
    countBadge: { backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    countText: { fontSize: 14, fontWeight: 'bold', color: '#00796B' },

    targetCard: {
        alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 24,
        marginBottom: 18, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    },
    targetLabel: { fontSize: 12, color: '#78909C', fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
    targetName: { fontSize: 20, fontWeight: '800', color: '#263238', marginTop: 10 },
    doneEmoji: { fontSize: 44 },
    doneText: { fontSize: 17, fontWeight: '800', color: '#2E7D32', marginTop: 8, textAlign: 'center' },

    listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00796B', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
    listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 520 },
    slot: {
        width: 104, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 2, borderColor: '#E0E0E0',
        alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6,
    },
    slotFound: { borderColor: '#66BB6A', backgroundColor: '#F1F8E9' },
    slotJust: { borderColor: '#43A047', backgroundColor: '#E8F5E9' },
    slotWrong: { borderColor: '#EF9A9A' },
    slotName: { fontSize: 12, fontWeight: '700', color: '#33691E', marginTop: 6, textAlign: 'center' },
    slotNamePlaceholder: { fontSize: 12, marginTop: 6 },
    check: { position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 12, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center', elevation: 3 },
    checkText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    hint: { fontSize: 14, color: '#455A64', marginTop: 20, fontWeight: '600', textAlign: 'center' },
});
