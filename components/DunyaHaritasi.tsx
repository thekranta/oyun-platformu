import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import WorldMap, { CONTINENTS } from './WorldMap';

// Dünya Haritası: Kıtaları Bul — MONTESSORI. Bir kıta adı verilir, çocuk haritada
// o kıtaya dokunur. Puan/yarış YOK, kendi kendini düzeltir; bulunca kıtanın adı
// haritada görünür (nomenklatür — Montessori kıta haritası çalışması).
// Maarif: SAB.2 (toplumsal/kültürel-coğrafi farkındalık).

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

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export default function DunyaHaritasi({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const order = useMemo(() => shuffle(CONTINENTS.map(c => c.id)), []);

    const [found, setFound] = useState<Set<string>>(new Set());
    const [wrongId, setWrongId] = useState<string | null>(null);
    const [justId, setJustId] = useState<string | null>(null);
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const targetId = order.find(id => !found.has(id));
    const target = CONTINENTS.find(c => c.id === targetId) || null;
    const allDone = target === null;

    const handleTap = (id: string) => {
        if (lockRef.current || allDone || !target) return;
        if (found.has(id)) return;
        movesRef.current += 1;

        if (id === target.id) {
            const nf = new Set(found); nf.add(id);
            setFound(nf);
            setJustId(id);
            startTimer(setTimeout(() => setJustId(null), 900));

            if (nf.size === CONTINENTS.length) {
                lockRef.current = true;
                startTimer(setTimeout(() => {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd('dunya-haritasi', duration, movesRef.current, errorsRef.current, undefined, {
                        zorlukSeviyesi: 1,
                        kazanimOdagi: 'SAB.2 Kıtaları tanıma / dünya haritası (Montessori)',
                    });
                }, 1500));
            }
        } else {
            errorsRef.current += 1;
            setWrongId(id);
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
                    <Text style={styles.title}>🗺️ Kıtaları Bul</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{found.size}/{CONTINENTS.length}</Text>
                    </View>
                </View>

                {/* Hedef kıta (nomenklatür) */}
                {target && !allDone && (
                    <View style={styles.targetCard}>
                        <Text style={styles.targetEmoji}>{target.emoji}</Text>
                        <View>
                            <Text style={styles.targetLabel}>Bunu haritada bul:</Text>
                            <Text style={styles.targetName}>{target.name}</Text>
                        </View>
                    </View>
                )}
                {allDone && (
                    <View style={styles.targetCard}>
                        <Text style={styles.targetEmoji}>🌍✨</Text>
                        <Text style={styles.doneText}>Aferin! Tüm kıtaları buldun.</Text>
                    </View>
                )}

                <WorldMap
                    foundIds={found}
                    wrongId={wrongId}
                    justId={justId}
                    onSelect={handleTap}
                    showLabels={false}
                    disabled={allDone}
                />

                <Text style={styles.hint}>
                    {allDone ? 'Dünyayı gezdin! 🌏' : 'Söylenen kıtaya haritada dokun — acele yok'}
                </Text>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    interaction="tap"
                    message="Bu bir dünya haritası! Söylenen kıtayı bul ve üzerine dokun."
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

    targetCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 18, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 14, elevation: 3,
    },
    targetEmoji: { fontSize: 40 },
    targetLabel: { fontSize: 12, color: '#78909C', fontWeight: '600' },
    targetName: { fontSize: 20, fontWeight: '900', color: '#263238' },
    doneText: { fontSize: 17, fontWeight: '800', color: '#2E7D32' },

    hint: { fontSize: 14, color: '#455A64', marginTop: 18, fontWeight: '600', textAlign: 'center' },
});
